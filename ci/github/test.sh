#!/usr/bin/env bash
# GitHub CI で実行する単体テストと境界検査を順に呼び出す入口です。
set -euo pipefail
mkdir -p .security .build
sh ci/test-docs-check.sh
for module in tools/*/go.mod; do
  dir=${module%/go.mod}
  if test "$dir" = tools/checksum; then continue; fi
  (cd "$dir"; go test ./...)
done
(cd tools/scan-gate; CGO_ENABLED=0 go build -trimpath -o ../../.security/scan-gate .)
(cd tools/oci-input
 for name in oci-crane-check github-oci-check; do
   CGO_ENABLED=0 go build -trimpath -o "../../.security/$name" "./cmd/$name"
 done)
(cd tools/release-record; CGO_ENABLED=0 go build -trimpath -o ../../.security/sbom-check ./cmd/sbom-check)
if test -f ci/github/release_test.py; then python3 -I ci/github/release_test.py; fi
