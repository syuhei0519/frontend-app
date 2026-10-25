// Account 画面で、取得・作成と通信失敗時の表示が利用者に正しく伝わることを確認します。
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './api/accounts'

const account = {
  id: 3,
  name: 'Test User',
  email: 'test@example.invalid',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const secondAccount = {
  ...account,
  id: 4,
  name: 'Second User',
  email: 'second@example.invalid',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

function editButton(name: string) {
  return within(screen.getByText(name).closest('li')!).getByRole('button', { name: '編集' })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('shows the loading fallback when the rejected value is not an Error', async () => {
  vi.spyOn(api, 'listAccounts').mockRejectedValue(null)
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('読み込みに失敗しました。')
  await waitFor(() => expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument())
})

it('keeps the account and input available when saving fails, then allows a retry', async () => {
  const user = userEvent.setup()
  vi.spyOn(api, 'listAccounts').mockResolvedValue([account])
  const update = vi.spyOn(api, 'updateAccount')
    .mockRejectedValueOnce(new Error('保存を再試行してください。'))
    .mockResolvedValueOnce({ ...account, name: 'Updated User' })
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '編集' }))
  await user.clear(screen.getByLabelText('名前'))
  await user.type(screen.getByLabelText('名前'), 'Updated User')
  await user.click(screen.getByRole('button', { name: '保存' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('保存を再試行してください。')
  expect(screen.getByLabelText('名前')).toHaveValue('Updated User')
  expect(screen.getByText('Test User')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: '保存' }))
  expect(await screen.findByText('Updated User')).toBeInTheDocument()
  expect(screen.queryByLabelText('名前')).not.toBeInTheDocument()
  expect(update).toHaveBeenLastCalledWith(3, { name: 'Updated User', email: account.email })
})

it('switches from account A to B with fresh input and saves only B', async () => {
  const user = userEvent.setup()
  vi.spyOn(api, 'listAccounts').mockResolvedValue([account, secondAccount])
  const update = vi.spyOn(api, 'updateAccount').mockResolvedValue({ ...secondAccount, name: 'Updated Second User' })
  render(<App />)

  await screen.findByText(account.name)
  await user.click(editButton(account.name))
  expect(screen.getByLabelText('名前')).toHaveValue(account.name)
  await user.click(editButton(secondAccount.name))
  expect(screen.getByLabelText('名前')).toHaveValue(secondAccount.name)
  await user.clear(screen.getByLabelText('名前'))
  await user.type(screen.getByLabelText('名前'), 'Updated Second User')
  await user.click(screen.getByRole('button', { name: '保存' }))

  await waitFor(() => expect(update).toHaveBeenCalledWith(secondAccount.id, {
    name: 'Updated Second User',
    email: secondAccount.email,
  }))
  expect(update).toHaveBeenCalledTimes(1)
})

it('switches from edit to a fresh create session without updating the edited account', async () => {
  const user = userEvent.setup()
  vi.spyOn(api, 'listAccounts').mockResolvedValue([account])
  const create = vi.spyOn(api, 'createAccount').mockResolvedValue({ ...secondAccount, name: 'New User' })
  const update = vi.spyOn(api, 'updateAccount')
  render(<App />)

  await screen.findByText(account.name)
  await user.click(editButton(account.name))
  await user.click(screen.getByRole('button', { name: 'アカウントを追加' }))
  expect(screen.getByLabelText('名前')).toHaveValue('')
  expect(screen.getByLabelText('メールアドレス')).toHaveValue('')
  await user.type(screen.getByLabelText('名前'), 'New User')
  await user.type(screen.getByLabelText('メールアドレス'), secondAccount.email)
  await user.click(screen.getByRole('button', { name: '保存' }))

  await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'New User', email: secondAccount.email }))
  expect(update).not.toHaveBeenCalled()
})

it('keeps a newer edit session open when an older save succeeds after cancel', async () => {
  const user = userEvent.setup()
  const pending = deferred<typeof account>()
  vi.spyOn(api, 'listAccounts').mockResolvedValue([account, secondAccount])
  vi.spyOn(api, 'updateAccount').mockReturnValue(pending.promise)
  render(<App />)

  await screen.findByText(account.name)
  await user.click(editButton(account.name))
  await user.click(screen.getByRole('button', { name: '保存' }))
  await user.click(screen.getByRole('button', { name: 'キャンセル' }))
  await user.click(editButton(secondAccount.name))
  await act(async () => {
    pending.resolve({ ...account, name: 'Saved First User' })
    await pending.promise
  })

  expect(screen.getByRole('heading', { name: 'アカウントを編集' })).toBeInTheDocument()
  expect(screen.getByLabelText('名前')).toHaveValue(secondAccount.name)
  expect(screen.getByText('Saved First User')).toBeInTheDocument()
})

it('keeps a re-opened session for the same account id when an older save succeeds', async () => {
  const user = userEvent.setup()
  const pending = deferred<typeof account>()
  vi.spyOn(api, 'listAccounts').mockResolvedValue([account])
  vi.spyOn(api, 'updateAccount').mockReturnValue(pending.promise)
  render(<App />)

  await screen.findByText(account.name)
  await user.click(editButton(account.name))
  await user.click(screen.getByRole('button', { name: '保存' }))
  await user.click(screen.getByRole('button', { name: 'キャンセル' }))
  await user.click(editButton(account.name))
  await user.clear(screen.getByLabelText('名前'))
  await user.type(screen.getByLabelText('名前'), 'Re-opened Session Input')
  await act(async () => {
    pending.resolve({ ...account, name: 'Saved First Session' })
    await pending.promise
  })

  expect(screen.getByRole('heading', { name: 'アカウントを編集' })).toBeInTheDocument()
  expect(screen.getByLabelText('名前')).toHaveValue('Re-opened Session Input')
})

it('does not leak an older failure into a new session for the same account id', async () => {
  const user = userEvent.setup()
  const pending = deferred<typeof account>()
  vi.spyOn(api, 'listAccounts').mockResolvedValue([account])
  vi.spyOn(api, 'updateAccount').mockReturnValue(pending.promise)
  render(<App />)

  await screen.findByText(account.name)
  await user.click(editButton(account.name))
  await user.click(screen.getByRole('button', { name: '保存' }))
  await user.click(screen.getByRole('button', { name: 'キャンセル' }))
  await user.click(editButton(account.name))
  await user.clear(screen.getByLabelText('名前'))
  await user.type(screen.getByLabelText('名前'), 'New Session Input')
  await act(async () => {
    pending.reject(new Error('古い保存の失敗'))
    await pending.promise.catch(() => undefined)
  })

  expect(screen.getByRole('heading', { name: 'アカウントを編集' })).toBeInTheDocument()
  expect(screen.getByLabelText('名前')).toHaveValue('New Session Input')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('keeps the account after a failed deletion and removes it only after success', async () => {
  const user = userEvent.setup()
  vi.spyOn(api, 'listAccounts').mockResolvedValue([account])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.spyOn(api, 'deleteAccount').mockRejectedValueOnce(undefined).mockResolvedValueOnce(undefined)
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '削除' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('削除に失敗しました。')
  expect(screen.getByText('Test User')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '削除' }))
  await waitFor(() => expect(screen.queryByText('Test User')).not.toBeInTheDocument())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
