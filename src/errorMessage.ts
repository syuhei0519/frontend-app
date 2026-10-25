// App と AccountForm の失敗表示を揃え、Error 以外にも操作に合った案内を返します。
// 値をそのまま文字列にすると、利用者に不要な内部情報が出る可能性がある。
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}
