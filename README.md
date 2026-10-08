# frontend-app

Account CRUD UI。Node.js 24.19.0を使用し、実行時は同一originの`/api/accounts`だけを呼び出します。

```text
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

React・APIクライアント・イメージ内Nginx既定設定とCIを本repositoryが所有します。環境のNginx設定・ConfigMap・Deploymentはapplication-manifest、Argo Application/AppProject/Namespaceはplatform-gitopsが所有します。`frontend` / `backend` / `application-gitops` は別系統で、今回の実装対象ではありません。

固定版台帳の正本はplatform-gitopsの `bootstrap/versions.lock.yaml` です。`ci/tool-versions.env` はPE-001時点で未作成であり、現在の実行値は `.gitlab-ci.yml` / Dockerfileにあります。後続PEで追加する際は台帳との対応を照合します。[PE-001基準記録](https://gitlab.com/syuhei-platform-engineering-lab/platform-gitops/-/blob/main/docs/implementation/PE-001-baseline.md) と [PE-001 Issue](https://gitlab.com/syuhei-platform-engineering-lab/platform-gitops/-/work_items/1) を参照してください。
