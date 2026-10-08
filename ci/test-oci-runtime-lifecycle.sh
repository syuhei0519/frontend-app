#!/bin/sh
# Local lifecycle fixtures only; no real OCI/runtime acceptance or credentials.
set -eu
root=$(pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
for scenario in empty-handoff fresh-build stale-private stale-success stale-failure unknown-entry wrong-job symlink runtime-failed; do
 dir="$work/$scenario"
 mkdir -p "$dir/ci" "$dir/.oci" "$dir/.security" "$dir/bin"
 cp "$root/ci/verify-oci-runtime.sh" "$dir/ci/"
 printf 'fixture archive\n' > "$dir/.oci/image.tar"
 (cd "$dir"; sha256sum .oci/image.tar > .oci/image.tar.sha256)
 printf 'buildPipelineId=10\nbuildJobId=11\n' > "$dir/.oci/build-input.txt"
 cat > "$dir/.security/oci-check" <<'SH'
#!/bin/sh
printf '{"digest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}\n'
SH
 cat > "$dir/bin/buildctl-daemonless.sh" <<'SH'
#!/bin/sh
printf 'isolated-runtime\n' >> calls
test "$SCENARIO" != runtime-failed
SH
 chmod +x "$dir/.security/oci-check" "$dir/bin/buildctl-daemonless.sh"
 if [ "$scenario" != fresh-build ]; then mkdir -p "$dir/.oci-runtime/public"; fi
 case "$scenario" in
  stale-private) mkdir "$dir/.oci-runtime/private";;
  stale-success) printf '{}\n' > "$dir/.oci-runtime/public/runtime.json";;
  stale-failure) printf '{}\n' > "$dir/.oci-runtime/public/failure.json";;
  unknown-entry) printf 'untrusted\n' > "$dir/.oci-runtime/public/unknown";;
  symlink) rmdir "$dir/.oci-runtime/public" "$dir/.oci-runtime"; mkdir "$dir/foreign"; ln -s foreign "$dir/.oci-runtime";;
 esac
 (
  cd "$dir"
  export SCENARIO="$scenario" OCI_VALIDATION_ENABLED=true OCI_REGISTRY_INSPECTION_ENABLED=true CI_JOB_NAME=registry-runtime-inspection CI_PIPELINE_ID=20 CI_JOB_ID=21 CI_COMMIT_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa REGISTRY_SOURCE_COMMIT=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  export PATH="$dir/bin:$PATH"
  if [ "$scenario" = fresh-build ]; then export OCI_REGISTRY_INSPECTION_ENABLED=false CI_JOB_NAME=oci-isolated-runtime; fi
  if [ "$scenario" = wrong-job ]; then export CI_JOB_NAME=oci-isolated-runtime; fi
  status=0
  sh ci/verify-oci-runtime.sh > output 2>&1 || status=$?
  case "$scenario" in
   empty-handoff|fresh-build)
    test "$status" -eq 0 && test -s .oci-runtime/public/runtime.json && test ! -e .oci-runtime/private
    test "$(cat calls)" = isolated-runtime
    grep -q '"buildPipelineId":10,"buildJobId":11' .oci-runtime/public/runtime.json
    grep -q '"runtimePipelineId":20,"runtimeJobId":21' .oci-runtime/public/runtime.json
    ;;
   runtime-failed)
    test "$status" -ne 0 && test ! -e .oci-runtime/public/runtime.json && test ! -e .oci-runtime/private
    grep -q '"stage":"isolated-http"' .oci-runtime/public/failure.json
    ;;
   *) test "$status" -ne 0 && test ! -e calls;;
  esac
 )
done
printf 'Runtime lifecycle: 9 offline fixtures passed; no real runtime acceptance claimed.\n'
