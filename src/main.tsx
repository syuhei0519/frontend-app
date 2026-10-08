// ブラウザ実行入口。index.htmlが読み込み、src/App.tsxをDOMへ描画する。
// APIはsrc/api/accounts.ts、配信時の/api転送はnginx/default.conf.template。
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
