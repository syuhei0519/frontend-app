// Static scanner fixture only. No top-level call or application import.
// Activate only on a disposable PR branch and remove before any merge.
export function codeqlOnly() {
  document.write(location.hash);
}
