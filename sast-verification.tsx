// Deliberate static-analysis input only. This component is never imported/mounted.
// Remove it after comparing scanner results on the Draft PR.
export function SastVerificationFixture({ html }: { html: string }) {
  const input = window.location.hash
  const target = document.getElementById('sast-never-mounted')
  if (target) target.innerHTML = input
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
