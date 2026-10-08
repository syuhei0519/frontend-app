// src/App.tsxから確定済みAccount[]を受けて一覧を描画する。
// 編集/削除はcallback通知し、DBやHTTPを直接操作しない。key=idでReactが各行を識別する。
import type { Account } from '../../types'

export function AccountList({ accounts, onEdit, onDelete }: { accounts: Account[]; onEdit: (account: Account) => void; onDelete: (account: Account) => void }) {
  if (accounts.length === 0) return <p className="empty">アカウントはまだありません。</p>
  return <ul className="accounts">{accounts.map((account) => <li key={account.id}>
    <div><strong>{account.name}</strong><span>{account.email}</span><small>更新: {new Date(account.updated_at).toLocaleString('ja-JP')}</small></div>
    <div className="actions"><button onClick={() => onEdit(account)}>編集</button><button className="danger" onClick={() => onDelete(account)}>削除</button></div>
  </li>)}</ul>
}
