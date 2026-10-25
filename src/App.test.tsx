import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
})
