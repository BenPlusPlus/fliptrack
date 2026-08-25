import type { OperatorIdentity } from '../middleware/auth.ts'
import type { Tag } from '../data/schema.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/shell.tsx'
import {
  fieldStack,
  ghostAction,
  heading,
  labelStyle,
  lead,
  mutedNote,
  tagSection,
} from '../ui/styles.ts'

export function AccountPage(handle: {
  props: { identity: OperatorIdentity; csrf: string; tags: Tag[] }
}) {
  return () => {
    let { identity, csrf, tags } = handle.props

    return (
      <AppShell title="Account" identity={identity} current="account">
        <h1 mix={heading}>Account</h1>
        <section mix={tagSection}>
          <h2 mix={heading}>Tags</h2>
          {tags.length === 0 ? (
            <p mix={lead}>No Tags yet. Name one on a Flip.</p>
          ) : (
            <ul mix={fieldStack}>
              {tags.map((tag) => (
                <li key={tag.id}>
                  <form
                    method="post"
                    action={routes.tags.rename.href({ tagId: tag.id })}
                    mix={fieldStack}
                  >
                    <input type="hidden" name="_csrf" value={csrf} />
                    <label mix={labelStyle}>
                      Tag name
                      <input type="text" name="name" defaultValue={tag.name} required />
                    </label>
                    <button type="submit" mix={ghostAction}>
                      Rename
                    </button>
                  </form>
                  <p mix={mutedNote}>
                    <a href={routes.tags.delete.index.href({ tagId: tag.id })}>Delete {tag.name}</a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
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
