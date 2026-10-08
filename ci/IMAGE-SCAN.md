# PE017F イメージ検査（実装途中）

PE016Fと共通保存契約PE017Cは受入済み。この変更はPE017Fのpolicy/SBOMと同jobのschema2 record確定を追加する。不変record保存・AT04/12の実受入は未完了であり、PE017F完了やPhase2採用を表さない。

`OCI_VALIDATION_ENABLED=true` と `IMAGE_SCAN_VALIDATION_ENABLED=true` を明示した試験だけで `oci-image-policy-validation` を実行する。buildのnative CI artifactを再checksum検証し、strict OCI展開と固定crane readerの全layer検証を行う。検証されたmanifestのconfig digestとTrivy報告のMetadata.ImageIDを照合する。image modeでは固定input `.oci/layout` / container_imageのみを受け入れ、既存FS modeはイメージ報告を拒否する。

固定Trivy0.75.0、DB UpdatedAt最大24時間、vuln/secret/misconfig、全severity、空ignorefile、全packageを使う。既存policyと同じ判定・例外期限・秘密値除去を適用する。OS inventoryのtargetは公開用 `image/os`、image内の絶対pathは安全な相対pathへ変換する。未知のunsafe targetを黙って捨てず拒否する。raw報告/logはprivate一時領域で削除し、公開artifactはwhitelist報告のみ。

config digestの意味は[固定Trivy版のReport定義](https://github.com/aquasecurity/trivy/blob/v0.75.0/pkg/types/report.go)のMetadata.ImageIDに基づく。これはmanifest digestと異なるため、両者を混同しない。

policy合格後に、同じJSON報告を固定Trivyの[convert](https://github.com/aquasecurity/trivy/blob/v0.75.0/pkg/commands/app.go)でCycloneDXへ変換する。入力やDBを再取得しない。公式1.7 schemaと全参照をhash固定でembeddedし、オフラインのfull schema/format assertion、config digest、scanner版、timestamp、依存参照、raw報告の全package Name/Versionの包含を検証する。解析失敗時はSBOM出力を削除し不採用のfailed recordを残す。recordは外側のdisk budget判定後に確定し、元build-input、producer/fresh consumerのstrict OCI proof、実archive checksum、crane config、同scan/SBOM bytes、policy/DB bytesを結合する。入力identityを証明できない場合はrecordを捏造せず静的failureを残す。raw報告とlogは確定後に削除する。protected writerは実装済みで、別read_api Reporterを使って実main/job/source/APIを照合し、同一safe報告の再送をサーバーが拒否した後、SBOMとrecordを最後に不変保存する。保護mainでの実結合受入・採用は未完了。

OCI試験を有効にしたmainでも旧publish/verify/proposalを選ばない。defaultは両flag falseで、PE018F完全切替までは従来のmain配信を維持する。新しい失敗を旧公開経路で迂回させない。今回の検証jobからregistry pushやmanifest提案は行わない。

ローカルの境界・secret redaction・severity・stale DB試験は合格。実CIの結果は別証跡で確定し、この文書だけを合格証明にしない。

`RELEASE_RECORD_STORE_ENABLED=true` は保護mainでのみ有効。専用 `release-evidence` 環境のhidden/protected/masked read_api資格を使用し、既存manifest readerの権限やTokenを変更しない。実job完了、現在の保護main、元build、source-scan/security-policy-test成功をAPI照合してから保存する。サーバー重複拒否を実測できなければrecordを公開しない。

未保護API試験では `AT17_SBOM_FAILURE=generate` / `invalid` による明示した生成・解析失敗fixtureを使用できる。実scanは成功でもSBOM失敗をfailed record/SBOM nullへ記録し、旧配信・提案へ迂回しない。fixtureと自然故障は証跡で区別する。

AT-04の受入は既定無効の `AT17_RESCAN_ACCEPTANCE_ENABLED=true` を保護mainのAPI試験で追加する。最初のscanとwriterを完了してから、同pipelineのmanual `oci-image-rescan-validation` を実DB更新後にplayする。元buildのnative artifactと最初のrecordを使い、DB日時が同じなら新日時を捏造せずfailed evidenceへ記録する。新DBの実scan通過後にSBOM生成を明示fixtureで停止する。第二writerは最初のimmutable recordの実GET/checksum/API完了を確認し、同digest・元build・archive・policyと別scan jobを結合して第二failed recordを保存する。`differentDatabase=true` の実証がなければAT-04を合格にしない。第一成功を第二失敗の採用許可へ流用しない。artifact失効や測定失敗を待機timeoutと混同しない。

これは017の検証経路であり018のregistry再取得による通常再検査ではない。017の中間main統合後もflag既定無効と選択中経路AT-05を確認し、実保存・同digest二run・失敗/入替試験の受入が完了するまで17Fを完了にしない。
