// 一覧と編集状態を持つReact画面。src/main.tsxから呼ばれ、APIのAccount[]を表示する。
// 入力はAccountForm、表示はAccountList、HTTP呼出はsrc/api/accounts.tsへ委譲する。
import { useEffect, useState } from 'react'
import { createAccount, deleteAccount, listAccounts, updateAccount } from './api/accounts'
import { AccountForm } from './features/accounts/AccountForm'
import { AccountList } from './features/accounts/AccountList'
import type { Account, AccountInput } from './types'

// editorはundefined=閉じる、null=新規、Account=編集の3状態。loadingとerrorで取得状態を表示する。
export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [editor, setEditor] = useState<Account | null>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // 初回一覧取得。cleanupのactive=falseで破棄後のstate更新を避けるが、進行中fetch自体は中断しない。
  useEffect(() => {
    let active = true
    void listAccounts().then((items) => { if (active) setAccounts(items) }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '読み込みに失敗しました。') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // API成功時だけ一覧を更新してフォームを閉じる。失敗は呼出元AccountFormのcatchへ伝える。
  async function save(input: AccountInput) {
    const saved = editor ? await updateAccount(editor.id, input) : await createAccount(input)
    setAccounts((items) => editor ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items])
    setEditor(undefined)
  }

  // 利用者確認後に削除。API成功後だけ一覧から外し、失敗なら一覧を残して画面へエラーを表示する。
  async function remove(account: Account) {
    if (!window.confirm(`${account.name}を削除しますか？`)) return
    try { await deleteAccount(account.id); setAccounts((items) => items.filter((item) => item.id !== account.id)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '削除に失敗しました。') }
  }

  return <main>
    <header><div><p>PLATFORM ENGINEERING LAB</p><h1>Account Console</h1></div><button className="primary" onClick={() => setEditor(null)}>アカウントを追加</button></header>
    {error && <p className="error" role="alert">{error}</p>}
    {editor !== undefined && <AccountForm account={editor ?? undefined} onSave={save} onCancel={() => setEditor(undefined)} />}
    <section><h2>アカウント一覧</h2>{loading ? <p>読み込み中…</p> : <AccountList accounts={accounts} onEdit={setEditor} onDelete={(account) => void remove(account)} />}</section>
  </main>
}
