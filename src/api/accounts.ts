// UI用のHTTP境界。App/AccountFormから呼ばれ、同一originの/apiへJSON要求を送る。
// nginx/default.conf.template→backend-app/internal/httpapi/server.goにつながる。accounts.test.tsが応答契約を確認する。
import type { Account, AccountInput } from '../types'

const messages: Record<number, string> = {
  400: '入力内容を確認してください。', 404: '対象が見つかりません。',
  409: 'このメールアドレスは登録済みです。', 503: '一時的に利用できません。',
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); this.name = 'ApiError' }
}

// TはTypeScriptの返却型指定であり、受信JSONの実行時schema検証ではない。
// 非2xxをApiErrorへ変換。ネットワーク失敗はfetchの例外が伝わり、自動retry/明示timeoutはここにはない。
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } }
    throw new ApiError(response.status, body.error?.code ?? 'request_failed', messages[response.status] ?? body.error?.message ?? '通信に失敗しました。')
  }
  // DELETE成功の204は本文がないためJSON解析しない。これを省くと正常削除が解析エラーになる。
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// CRUDのpathとmethodを固定。入力をJSONへ変換するだけで、業務検証・一意性はbackendが最終判定する。
export const listAccounts = () => request<Account[]>('/accounts')
export const getAccount = (id: number) => request<Account>(`/accounts/${id}`)
export const createAccount = (input: AccountInput) => request<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) })
export const updateAccount = (id: number, input: AccountInput) => request<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(input) })
export const deleteAccount = (id: number) => request<void>(`/accounts/${id}`, { method: 'DELETE' })
