// backend JSONに対応するTypeScript型。src/api/accounts.tsとフォーム/一覧が共有する。
// 型定義だけでは受信値の実行時検証やDB制約を保証しない。
export interface Account {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
}

export type AccountInput = Pick<Account, 'name' | 'email'>
