# frontend-app

画面を含むアプリの変更と配備の関係は [4 repository 共通の学習ガイド](https://github.com/syuhei0519/platform-gitops/blob/205e9a652d9fa5b550c7cb813bf94a64fcfa7f62/docs/learning-guides/README.md) を参照してください。Account API の実例で CI から Pod までを追い、障害復旧と検証の読み方を説明します。この repo の利用者向け画面と、application-manifest にある Backstage のリリース画面は別の役割です。

## Existing kind deployment (PLAT-195/198)

For `kind-learning-20261018-69c763`, the ordinary deployment entry is a reviewed
Git commit/PR followed by Argo CD sync. Follow the [current deployment contract](https://github.com/syuhei0519/platform-gitops/blob/main/learning/existing-kind/DEPLOYMENT.md).
Manual workload apply, image mutation and rollout restart from historical learning
instructions are retired. Existing Argo Core is reused; the old platform-lab and
isolated Account trial instructions are not the current cluster's deployment route.
This entry-point change does not claim that the pending PLAT-177/199 acceptance has passed.


Account CRUD UI。Node.js 24.19.0を使用し、実行時は同一originの`/api/accounts`だけを呼び出します。

```text
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

React・APIクライアント・イメージ内Nginx既定設定とCIを本repositoryが所有します。環境のNginx設定・ConfigMap・Deploymentはapplication-manifest、Argo Application/AppProject/Namespaceはplatform-gitopsが所有します。`frontend` / `backend` / `application-gitops` は別系統で、今回の実装対象ではありません。

固定版台帳の正本はplatform-gitopsの `bootstrap/versions.lock.yaml` です。`ci/tool-versions.env` はPE-001時点で未作成であり、現在の実行値は `.github/workflows/ci.yml` / Dockerfileにあります。後続PEで追加する際は台帳との対応を照合します。[PE-001基準記録](https://github.com/syuhei0519/platform-gitops/blob/main/docs/implementation/PE-001-baseline.md) を参照してください。

## 構成と入口

Account の一覧・作成・編集・削除を行う React 画面と、本番配信用の nginx 設定を管理します。

この階層のディレクトリと役割は次のとおりです。末端のファイルは親の説明から追えます。

| 場所 | 役割 |
| --- | --- |
| [.github/](.github/README.md) | GitHub の CI、Issue、PR の入口。実行条件は workflows に置きます。 |
| [ci/](ci/README.md) | 検査の実行手順と境界テスト。GitHub から呼ぶ処理は github にまとめます。 |
| [docs/](docs/README.md) | 設計上の約束、検証結果、運用・引き継ぎの文書。過去の記録と現在の手順を区別して読みます。 |
| [nginx/](nginx) | 本番用イメージで画面を配信し、API への要求を転送する設定。 |
| [security/](security/README.md) | 検査の合否条件と schema。アプリの機能設定とは分けて管理します。 |
| [src/](src/README.md) | React の画面、API 呼び出し、共通の型とテスト。 |
| [tools/](tools/README.md) | CI から呼ぶ Go ツールと、共有ツールの利用手順。 |

### 本文にコメントを入れないファイル

JSON などの形式、埋め込み・checksum、既存 reader の文字コードの前提を保つため、役割はここで説明します。

| ファイル | 役割 |
| --- | --- |
| [index.html](index.html) | Vite が読み込む画面の入口です。React を表示する要素と起動するスクリプトを指定します。 |
| [package.json](package.json) | 画面の依存ライブラリと、開発・テスト・ビルドの npm コマンドを定義します。 |
| [renovate.json](renovate.json) | 依存と共有 CI の固定参照を更新する Bot の設定です。有効・無効の状態もここで指定します。 |
| [tsconfig.app.json](tsconfig.app.json) | ブラウザーで動く画面コードの TypeScript 型検査と読み込み方を定めます。 |
| [tsconfig.json](tsconfig.json) | 画面用と開発ツール用の TypeScript 設定をまとめる参照元です。 |
| [tsconfig.node.json](tsconfig.node.json) | Vite など Node.js 側で動く設定ファイルの TypeScript 検査条件を定めます。 |

ファイルの説明範囲と除外理由は [棚卸し記録](docs/file-guide.md) を参照してください。
