// 新規/編集フォーム。src/App.tsxから初期Accountと保存/取消callbackを受ける。
// 入力制約をブラウザへ渡し、保存失敗を表示する。最終検証はbackend-app/internal/account/account.go。
import { FormEvent, useState } from 'react'
import type { Account, AccountInput } from '../../types'

// account有無で初期値と見出しを変える。入力はlocal stateへ保持し、onSaveへAccountInputを渡す。
export function AccountForm({ account, onSave, onCancel }: { account?: Account; onSave: (input: AccountInput) => Promise<void>; onCancel: () => void }) {
  const [input, setInput] = useState<AccountInput>({ name: account?.name ?? '', email: account?.email ?? '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // preventDefaultでページ再読込を防ぎ、保存中はボタンを無効化。finallyは成功/失敗どちらでもsavingを戻す。
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSaving(true)
    try { await onSave(input) } catch (cause) { setError(cause instanceof Error ? cause.message : '保存に失敗しました。') } finally { setSaving(false) }
  }
  return <form className="account-form" onSubmit={(event) => void submit(event)}>
    <h2>{account ? 'アカウントを編集' : 'アカウントを追加'}</h2>
    <label>名前<input required maxLength={100} value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} /></label>
    <label>メールアドレス<input required type="email" maxLength={254} value={input.email} onChange={(event) => setInput({ ...input, email: event.target.value })} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><button type="button" onClick={onCancel}>キャンセル</button><button className="primary" disabled={saving}>{saving ? '保存中…' : '保存'}</button></div>
  </form>
}
