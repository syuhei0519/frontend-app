// 一覧と編集状態を持つReact画面。src/main.tsxから呼ばれ、APIのAccount[]を表示する。
// 入力はAccountForm、表示はAccountList、HTTP呼出はsrc/api/accounts.tsへ委譲する。
import { useEffect, useRef, useState } from 'react'
import { createAccount, deleteAccount, listAccounts, updateAccount } from './api/accounts'
import { errorMessage } from './errorMessage'
import { AccountForm } from './features/accounts/AccountForm'
import { AccountList } from './features/accounts/AccountList'
import type { Account, AccountInput } from './types'

type EditorSession = { id: number; account?: Account }
type ScreenError = { source: 'load' | 'delete'; message: string }

// editorは開くたびに別のsession idを持ち、account有無で編集/新規を区別する。
export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [editor, setEditor] = useState<EditorSession>()
  const [error, setError] = useState<ScreenError>()
  const [loading, setLoading] = useState(true)
  const nextEditorSessionId = useRef(0)

  // 画面を閉じた後に応答が届いても、表示状態を更新しないようにする。
  // 通信自体は続くため、成功・失敗・終了のすべてで active を確認する。
  useEffect(() => {
    let active = true
    void listAccounts()
      .then((items) => {
        if (active) setAccounts(items)
      })
      .catch((cause: unknown) => {
        if (active) setError({ source: 'load', message: errorMessage(cause, '読み込みに失敗しました。') })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function openEditor(account?: Account) {
    setEditor({ id: ++nextEditorSessionId.current, account })
  }

  // 保存対象は開始時のsessionへ固定し、遅延した完了は同じsessionだけを閉じる。
  async function save(session: EditorSession, input: AccountInput) {
    const targetId = session.account?.id
    const saved = targetId !== undefined
      ? await updateAccount(targetId, input)
      : await createAccount(input)
    setAccounts((items) => targetId !== undefined
      ? items.map((item) => item.id === targetId ? saved : item)
      : [saved, ...items])
    setEditor((current) => current?.id === session.id ? undefined : current)
  }

  // 利用者確認後に削除。API成功後だけ一覧から外し、失敗なら一覧を残して画面へエラーを表示する。
  async function remove(account: Account) {
    if (!window.confirm(`${account.name}を削除しますか？`)) return
    try {
      await deleteAccount(account.id)
      setAccounts((items) => items.filter((item) => item.id !== account.id))
      setError((current) => current?.source === 'delete' ? undefined : current)
    } catch (cause) {
      setError({ source: 'delete', message: errorMessage(cause, '削除に失敗しました。') })
    }
  }

  return <main>
    <header><div><p>PLATFORM ENGINEERING LAB</p><h1>Account Console</h1></div><button className="primary" onClick={() => openEditor()}>アカウントを追加</button></header>
    {error && <p className="error" role="alert">{error.message}</p>}
    {editor !== undefined && <AccountForm key={editor.id} account={editor.account} onSave={(input) => save(editor, input)} onCancel={() => setEditor((current) => current?.id === editor.id ? undefined : current)} />}
    <section><h2>アカウント一覧</h2>{loading ? <p>読み込み中…</p> : <AccountList accounts={accounts} onEdit={openEditor} onDelete={(account) => void remove(account)} />}</section>
  </main>
}
