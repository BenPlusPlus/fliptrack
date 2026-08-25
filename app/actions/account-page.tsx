import type { OperatorIdentity } from '../middleware/auth.ts'
import type { Channel, Tag } from '../data/schema.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/shell.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  heading,
  labelStyle,
  lead,
  mutedNote,
  primaryAction,
  tagSection,
} from '../ui/styles.ts'

export function AccountPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    tags: Tag[]
    channels: Channel[]
    error?: string
  }
}) {
  return () => {
    let { identity, csrf, tags, channels, error } = handle.props
    let readOnly = identity.inspecting != null

    return (
      <AppShell title="Account" identity={identity} csrf={csrf} current="account">
        <h1 mix={heading}>Account</h1>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <section mix={tagSection}>
          <h2 mix={heading}>Tags</h2>
          {tags.length === 0 ? (
            <p mix={lead}>No Tags yet. Name one on a Flip.</p>
          ) : (
            <ul mix={fieldStack}>
              {tags.map((tag) => (
                <li key={tag.id}>
                  {readOnly ? (
                    <p>{tag.name}</p>
                  ) : (
                    <>
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
                        <a href={routes.tags.delete.index.href({ tagId: tag.id })}>
                          Delete {tag.name}
                        </a>
                      </p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section mix={tagSection}>
          <h2 mix={heading}>Channels</h2>
          {channels.length === 0 ? (
            <p mix={lead}>No Channels yet. Name one on a Sale.</p>
          ) : (
            <ul mix={fieldStack}>
              {channels.map((channel) => (
                <li key={channel.id}>
                  {readOnly ? (
                    <p>{channel.name}</p>
                  ) : (
                    <>
                      <p>{channel.name}</p>
                      <form
                        method="post"
                        action={routes.channels.rename.href({ channelId: channel.id })}
                        mix={fieldStack}
                      >
                        <input type="hidden" name="_csrf" value={csrf} />
                        <label mix={labelStyle}>
                          Channel name
                          <input type="text" name="name" defaultValue={channel.name} required />
                        </label>
                        <button type="submit" mix={ghostAction}>
                          Rename
                        </button>
                      </form>
                      <p mix={mutedNote}>
                        <a href={routes.channels.delete.index.href({ channelId: channel.id })}>
                          Delete {channel.name}
                        </a>
                      </p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        {readOnly ? null : (
          <section mix={tagSection}>
            <h2 mix={heading}>Change password</h2>
            <form method="post" action={routes.accountPassword.href()} mix={fieldStack}>
              <input type="hidden" name="_csrf" value={csrf} />
              <label mix={labelStyle}>
                Current password
                <input
                  type="password"
                  name="current_password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label mix={labelStyle}>
                New password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" mix={primaryAction}>
                Save password
              </button>
            </form>
          </section>
        )}
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
