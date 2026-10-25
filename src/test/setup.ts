// 画面テストの前に、DOM の検証や後片付けに必要な共通設定を読み込みます。
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
afterEach(cleanup)
