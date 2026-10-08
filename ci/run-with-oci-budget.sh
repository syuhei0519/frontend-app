#!/bin/sh
# build/format/runtime/publishの処理を包む一時disk sampler。ci/includes/oci-validation.ymlなどから呼ぶ。
# 数値だけをpublic/disk.jsonへ保存。計測不能・予算超過は2、計測成功時は内部commandの終了コードを返す。
# 2秒sampleの最大値であり、sample間の瞬間peakを保証しない。
# Numeric-only sampler against the pre-existing PE009 Runner disk profile.
set -eu
kind=$1; shift
case "$kind" in build|format|runtime|publish) ;; *) exit 1;; esac
base=".oci-budget-$kind"
test ! -e "$base" || exit 1
mkdir -p "$base/private" "$base/public"
sample() {
 raw=$(du -sk "$CI_PROJECT_DIR" 2> "$base/private/du.log") || return 1
 work=$(printf "%s\n" "$raw" | cut -f 1)
 store=0; observed=0; namespace=0
 for root in /home/user/.local/share/buildkit /tmp/.local/share/buildkit; do
  if [ -d "$root" ]; then
   if ! raw=$(du -sk "$root" 2>> "$base/private/du.log"); then
    # BuildKitのsubordinate UIDのrootfsはuser namespaceの外から読めないことがある。同じ固定imageのUID mappingで作るnamespaceから計測する。
    command -v rootlesskit >/dev/null 2>&1 || return 1
    raw=$(rootlesskit du -sk "$root" 2>> "$base/private/du.log") || return 1
    namespace=1
   fi
   size=$(printf "%s\n" "$raw" | cut -f 1)
   store=$((store + size))
   observed=1
  fi
 done
 free=$(df -Pk "$CI_PROJECT_DIR" | awk 'NR==2 { if ($2>0) printf "%.6f",100*$4/$2 }')
 test -n "$work" && test -n "$free" || return 1
 printf '%s %s %s %s %s\n' "$work" "$store" "$free" "$observed" "$namespace" >> "$base/private/samples.txt"
}
if ! sample; then
 printf '{"schemaVersion":1,"scope":"PE016F sampled temporary disk","measurementAvailable":false,"withinBudget":false}\n' > "$base/public/disk.json"
 rm -rf "$base/private"
 exit 2
fi
(while :; do sleep 2; sample || { : > "$base/private/sample-failed"; exit 1; }; done) & sampler=$!
# samplerを停止してwaitで回収し、private計測資源を削除する。
# 内部commandの成否と計測の成否を別々に確認し、計測不能を正常扱いしない。
cleanup() { kill "$sampler" 2>/dev/null || true; wait "$sampler" 2>/dev/null || true; rm -rf "$base/private"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
status=0
"$@" || status=$?
kill "$sampler" 2>/dev/null || true
wait "$sampler" 2>/dev/null || true
sample || : > "$base/private/sample-failed"
if [ -e "$base/private/sample-failed" ]; then
 printf '{"schemaVersion":1,"scope":"PE016F sampled temporary disk","measurementAvailable":false,"withinBudget":false}\n' > "$base/public/disk.json"
 exit 2
fi
awk -v kind="$kind" 'BEGIN {min=100;n=0;w=0;s=0;o=0;u=0} {n++;if($1>w)w=$1;if($2>s)s=$2;if($3<min)min=$3;if($4>o)o=$4;if($5>u)u=$5} END {ok=(n>=2 && w<=2097152 && s<=10485760 && min>=20);printf "{\"schemaVersion\":1,\"scope\":\"PE016F sampled temporary disk\",\"kind\":\"%s\",\"samples\":%d,\"intervalSeconds\":2,\"maxWorkspaceKiB\":%d,\"workspaceLimitKiB\":2097152,\"maxBuildkitStoreKiB\":%d,\"buildkitStoreLimitKiB\":10485760,\"buildkitStoreObserved\":%s,\"buildkitStoreAggregation\":\"sumConfiguredRoots\",\"rootlessNamespaceUsed\":%s,\"minFilesystemFreePercent\":%.6f,\"measurementAvailable\":true,\"withinBudget\":%s,\"continuousPeakClaim\":false}\n",kind,n,w,s,(o?"true":"false"),(u?"true":"false"),min,(ok?"true":"false");if(!ok)exit 2}' "$base/private/samples.txt" > "$base/public/disk.json" || exit 2
exit "$status"
