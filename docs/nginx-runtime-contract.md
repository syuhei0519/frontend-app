# PE-005 Nginx環境設定の所有

nginx/default.conf.templateはイメージ単独起動時の既定値（/api/→backend.account.svc.cluster.local:8080、/livez・/readyz、static SPA fallback）。application-manifest/charts/frontendのConfigMapが/etc/nginx/conf.dへmountされる配備では、chartのapiBasePath/apiUpstreamが実行時設定を所有する。

chart設定変更時はDeployment checksum/configでPodを置き換え、Nginxの実読込とAPI応答を確認する。React静的bundleへSecretを含めない。イメージ既定設定の変更だけで環境ConfigMapが自動更新されるとは想定しない。静的checksumテストと実rollout/HTTP証跡はapplication-manifestのPE-005で追跡する。
