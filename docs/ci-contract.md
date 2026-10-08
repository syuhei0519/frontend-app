# frontend CI実行契約

保護mainの配信はOCIを一度生成し、その同じ入力をscan・完全SBOM・形式/runtime検査・不変record保存へ結合する。全て成功した候補だけを公開し、実公開証跡を再読したverify-oci-release成功後にmanifestへschema2を提案する。旧未検査のpublish-image経路は撤去した。この契約の実受入状況はPE018F証跡に記録する。

| pipeline | 検証 | 公開/検証/提案 | 条件 |
|---|---|---|---|
| 通常branch、MRなし | 全validateジョブ | なし | branchあり |
| 同project MR | 全validateジョブ | なし | source project == pipeline project |
| branch、MRあり | push pipeline抑止 | なし | 重複抑止 |
| 保護main | 全validateジョブ | 全deliveryジョブ | protected == true |
| 保護されていないmain | 全validateジョブ | なし | 公開を拒否 |
| tag | pipelineなし | なし | 最初のworkflow規則 |
| fork/外部MR | pipelineなし | なし | source project不一致 |

| job | needs | cache | artifacts期限 |
|---|---|---|---|
| 言語固有lint/typecheck/test/build、Go製manifest-helper-test | なし（validate stage） | lock/input hash + tool + linux/amd64 + protected境界 | buildのみ1日 |
| container-build-oci | 言語検証・source-scan・security-policy-test | Registry cache入出力無効 | private OCI 1日 |
| oci-image-policy-validation、oci-format-compatibility、oci-isolated-runtime | 同じ元OCIと検証済みtools | 保護区分別Trivy DBのみ | 安全なJSON/SBOM 90日 |
| release-record-store | 今回scanとsource-scan | なし | 不変recordのnative JSONは期限なし |
| publish-oci | scan・不変writer・形式/runtime | なし | 安全な公開証跡90日 |
| verify-oci-release | publish-oci・writer・検証済みtools | なし | 読み直したrunの証跡90日 |
| propose-oci-manifest-update | 実成功verify-oci-release | なし | なし |

新規SHAは固定Registryのmanifest 404だけを新build許可とする。既存タグ・認証拒否・通信失敗・不正Sourceを未公開扱いにしない。公開済みSHAの再実行はprotected mainのAPI pipelineでOCI_REGISTRY_RETRIEVAL_ENABLED=true、OCI_REGISTRY_INSPECTION_ENABLED=true、OCI_DELIVERY_VALIDATION_ENABLED=falseを明示し、固定登録originを選択する。再取得した同digestを最新DBで再検査し、新runのrecord/SBOMを保存した後、既存tagの読取照合だけで新しい提案を作る。再build・再push・過去の合格へのfallbackは禁止する。歴史候補はOCI_ROLLBACK_RETRIEVAL_ENABLED=trueで別に再検査し、自動current提案から除外する。

失敗はallow_failure=false（既定）。手動再実行でもpublishの全needsを満たす。retryはRunner障害/外部依存障害/Runner中断/ジョブのstuckに最大1回。script_failure（静的検査/テスト/ビルド/方針違反/スクリプト内通信失敗）を自動retryしない。deliveryは直列resource_groupを維持する。

cacheはダウンロード依存とコンパイルcacheだけ。node_modules/dist/配信imageをcacheで信頼しない。keyは依存入力hash、固定tool、対象arch、CI_COMMIT_REF_PROTECTED。unprotect=false。GitLabの保護cache分離設定と実書込権限の確認はAT-13に別記する。

rulesは認可ではない。同project MRも信頼済みコードだけを例外付きRunnerで実行する。MRからRegistry/package/cacheへの技術的書込可否はrulesでは証明できない。Protected/masked変数は保護mainと用途別environmentに限定し、MRの変更済みコードへ秘密を渡さない。トークン発行/scope/保護設定はこのMRで変更していない。

tool-versions.envは実行imageと一致させる。正本台帳bootstrap/versions.lock.yamlとの版/digest/対応commit照合はplatform側MRで記録する。

検証: ローカル言語テストとMR pipelineを記録。branch/main/tag条件の実pipeline確認、失敗pipeline後続停止、AT-13の使い捨てSHA/cache/package実権限測定は未実施。合格とは扱わない。マージ後にmain配信を確認し、提案gate結合はPE-004で受入する。

rollback: この変更commitをrevertする。Registry cache再有効化は明示レビューを要する。

参照: [GitLab YAML](https://docs.gitlab.com/ci/yaml/)、[cache](https://docs.gitlab.com/ci/caching/examples/)、[PE-008](https://gitlab.com/syuhei-platform-engineering-lab/platform-gitops/-/work_items/8)。

## 2026-10-02 AT-13の実権限

未保護の信頼済み試験branchでjob 16885612226が完全40桁SHAタグ、使い捨てregistry main-cacheタグ、証跡packageへ実書込し、いずれもHTTP201だった。提案credentialは未保護jobに渡らない。ci_separated_caches=true、cacheのunprotect=falseでRunner cacheの保護区分を分ける。registry cacheの入出力は無効を維持する。使い捨てregistry cacheタグへのwrite許可と、Runnerの保護cache分離を混同しない。

CI_JOB_TOKENによる同project registry/packageへの書込は技術的に拒否されていない。rulesを認可境界と扱わず、同projectも信頼済みコードのみ、外部MR禁止、変更CIの事前確認を有効化条件とする。registry/package保護設定を強化した保証はまだない。Phase 2の証跡不変性はPE-017/018で別受入する。

OwnerによるAPI pipelineの変数AT13_FORCE_VALIDATION_FAILURE=trueはhelper検証をscript_failureで終了する受入fixture。通常はfalseで言語テスト後のdeliveryを維持する。全deliveryが失敗needsで停止し、script_failureがretryされないことを実mainで測定する。pipeline変数overrideの最小権限はOwner。秘密値はfixtureに渡さず、証跡はHTTP結果・SHA/job IDだけを記録する。
