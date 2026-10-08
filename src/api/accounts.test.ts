// fetch mockでCRUD path/method・DELETE204・400/404/409/503変換を確認する。
// src/api/accounts.tsの境界契約を守り、実backendやDBへ接続しない。afterEachでmockを復元する。
import { afterEach, expect, it, vi } from 'vitest'
import { ApiError, createAccount, deleteAccount, getAccount, listAccounts, updateAccount } from './accounts'

afterEach(() => vi.restoreAllMocks())
it.each([
  [() => listAccounts(), '/api/accounts', undefined],
  [() => getAccount(3), '/api/accounts/3', undefined],
  [() => createAccount({ name: 'Test', email: 'test@example.invalid' }), '/api/accounts', 'POST'],
  [() => updateAccount(3, { name: 'Test', email: 'test@example.invalid' }), '/api/accounts/3', 'PUT'],
  [() => deleteAccount(3), '/api/accounts/3', 'DELETE'],
])('uses the fixed API contract', async (invoke, path, method) => {
  const response = method === 'DELETE' ? new Response(null, { status: 204 }) : new Response(JSON.stringify(path.endsWith('accounts') && !method ? [] : {}), { status: 200 })
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
  await invoke(); expect(fetchMock).toHaveBeenCalledWith(path, expect.objectContaining(method ? { method } : {}))
})
it.each([400, 404, 409, 503])('maps status %d', async (status) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'failed' } }), { status }))
  await expect(listAccounts()).rejects.toMatchObject({ status, code: 'failed' } satisfies Partial<ApiError>)
})
