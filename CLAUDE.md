# frontend-app

## 目的
Account CRUD の画面（React + Vite + TypeScript）を作る repo。実行時は同一 origin の `/api/accounts` だけを呼ぶ。
Node.js は 24.19.0 に固定している（`package.json` の engines、`ci/tool-versions.env`）。

## 構成
- `src/`: アプリ本体とテスト（`src/api`、`src/features`、`src/test`）
- `nginx/default.conf.template`: イメージ内 Nginx の既定設定
- `Dockerfile`: 配備イメージ
- `ci/`: CI の入口（`classify.py` などは `ci/github/`）、SAST と Sonar の試験
- `security/`: SAST・scan の方針と Semgrep・CodeQL の設定
- `tools/`: CI で共有ツールを展開する先（git 管理外）
- `docs/`: CI・SAST・運用の記録

環境ごとの Nginx 設定、ConfigMap、Deployment は application-manifest、Argo CD の Application は platform-gitops が持つ。この repo では変えない。

## コマンド
今の CI（`.github/workflows/ci.yml` の validate と sast）が流しているもの。

```text
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
python3 -I ci/sast_test.py -v
python3 -I ci/sast-workflow_test.py -v
python3 -I ci/sonar-main_test.py -v
python3 -I ci/github/release_test.py
```

`bash ci/github/test.sh` と `bash ci/github/source-scan.sh` は shared-tools と Go が要る。主にCIで流す。

## 変更の流れ
1. main から `feat|fix|chore|docs/PLAT-番号-短い名前` のブランチを切る。
2. 変更し、上のコマンドで lint とテストを通す。
3. コミットし、push して PR を作る。タイトルは「PLAT-番号: 要約」。
4. PR 本文は「何を／なぜ／どう確かめたか／学び」の 4 見出し。実行したコマンドと出力を貼る。
5. CI の `ci-result` と `pr-conventions` が success になってから、人が merge する。

## 守ること
- main へ push しない。force push、`gh pr merge` もしない（`.claude/settings.json` の deny）。
- 資格情報（`~/.ssh`、`~/.config/gh`、`.env`、`*.pem`、`*.key`）を読まない。値を PR・ログに出さない。
- `npm ci` は確認を挟む。sandbox の通信先は GitHub 系、Atlassian、registry.npmjs.org だけ。
- 実行できなかった確認は「未確認」と書き、理由を添える。
- 版番号は公式のリリース一覧で確かめてから固定する。

## この repo 固有の注意
- action、イメージ、ツールはハッシュか版で固定している。更新は `ci/tool-versions.env` と ci.yml を合わせる。
- `ci/sast-workflow_test.py` は ci.yml の `needs` と ci-result の判定を固定文字列で検査する。ci.yml の ci-result を変えたらこの試験も直す。
- SAST と scan の例外（`security/`）は、この作業の範囲では変えない。
- `.github/workflows/claude-review.yml`、`pr-conventions.yml`、`.github/PULL_REQUEST_TEMPLATE.md`、`CODEOWNERS` は ai-development-system の `templates/` と同じ内容。直すときは先にひな形を直す。
- CODEOWNERS の `/bootstrap/`、`/gitops/root/`、`/scripts/seed-secrets.sh` はこの repo にないパス。
