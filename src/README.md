# src の見方

React の画面、API 呼び出し、共通の型とテスト。

## 構成と入口

[main.tsx](main.tsx) が画面を起動し、[App.tsx](App.tsx) が Account の取得と画面部品をまとめます。

この階層のディレクトリと役割は次のとおりです。末端のファイルは親の説明から追えます。

| 場所 | 役割 |
| --- | --- |
| [api/](api) | Account API の HTTP 呼び出しと、応答・失敗の扱いを確認するテスト。 |
| [features/](features) | 機能ごとの画面部品。accounts に作成フォームと一覧を置きます。 |
| [test/](test) | 画面テスト共通の DOM 設定と後片付け。 |
