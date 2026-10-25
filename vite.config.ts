// 開発サーバー・本番ビルド・画面テストが使う Vite の設定をまとめます。
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': 'http://localhost:8080' } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' },
})
