import type { OperatorIdentity } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/shell.tsx'
import { ghostAction, heading } from '../ui/styles.ts'

export function AccountPage(handle: { props: { identity: OperatorIdentity; csrf: string } }) {
  return () => {
    let { identity, csrf } = handle.props

    return (
      <AppShell title="Account" identity={identity} current="account">
        <h1 mix={heading}>Account</h1>
        <form method="post" action={routes.logout.href()}>
          <input type="hidden" name="_csrf" value={csrf} />
          <button type="submit" mix={ghostAction}>
            Logout
          </button>
        </form>
      </AppShell>
    )
  }
}
