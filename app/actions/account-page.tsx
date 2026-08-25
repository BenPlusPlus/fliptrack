import { css } from 'remix/ui'

import type { OperatorIdentity } from '../middleware/auth.ts'
import type { Channel, Tag } from '../data/schema.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/shell.tsx'
import { EmptyState, PageHeader, Receipt, Subheading } from '../ui/components.tsx'
import {
  dangerAction,
  displayTitle,
  errorBanner,
  fieldStack,
  ghostAction,
  labelStyle,
  ledgerRow,
  mutedNote,
  primaryAction,
  rowMain,
  splitLayoutEven,
  stackGap,
} from '../ui/styles.ts'

/* Name + inline rename form share a row; the row itself carries no fixed
 * height so the form can wrap onto its own line under narrow widths. The
 * flex sizing has to land on the label, not the input — the input is a
 * column-flex child of the label, where `flex-basis` would size its height. */
const renameForm = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: '0.6rem',
  margin: '0.7rem 0 0',
  '& > label': { flex: '1 1 10rem', minWidth: 0 },
})

const itemName = css({ fontSize: '1.05rem', margin: 0 })

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
        <PageHeader title="Account" />
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <div mix={splitLayoutEven}>
          <div mix={stackGap}>
            <Receipt>
              <Subheading>Tags</Subheading>
              {tags.length === 0 ? (
                <EmptyState title="No Tags yet." note="Name one on a Flip." />
              ) : (
                <ul mix={fieldStack}>
                  {tags.map((tag) => (
                    <li key={tag.id} mix={ledgerRow}>
                      <div mix={rowMain}>
                        <span mix={[displayTitle, itemName]}>{tag.name}</span>
                        {readOnly ? null : (
                          <a
                            href={routes.tags.delete.index.href({ tagId: tag.id })}
                            mix={dangerAction}
                          >
                            Delete
                          </a>
                        )}
                      </div>
                      {readOnly ? null : (
                        <form
                          method="post"
                          action={routes.tags.rename.href({ tagId: tag.id })}
                          mix={renameForm}
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
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Receipt>
            <Receipt>
              <Subheading>Channels</Subheading>
              {channels.length === 0 ? (
                <EmptyState title="No Channels yet." note="Name one on a Sale." />
              ) : (
                <ul mix={fieldStack}>
                  {channels.map((channel) => (
                    <li key={channel.id} mix={ledgerRow}>
                      <div mix={rowMain}>
                        <span mix={[displayTitle, itemName]}>{channel.name}</span>
                        {readOnly ? null : (
                          <a
                            href={routes.channels.delete.index.href({ channelId: channel.id })}
                            mix={dangerAction}
                          >
                            Delete
                          </a>
                        )}
                      </div>
                      {readOnly ? null : (
                        <form
                          method="post"
                          action={routes.channels.rename.href({ channelId: channel.id })}
                          mix={renameForm}
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
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Receipt>
          </div>
          <div mix={stackGap}>
            {readOnly ? null : (
              <Receipt>
                <Subheading>Change password</Subheading>
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
              </Receipt>
            )}
            <Receipt>
              <Subheading>Sign out</Subheading>
              <p mix={mutedNote}>Ends this Session on this device only.</p>
              <form method="post" action={routes.logout.href()}>
                <input type="hidden" name="_csrf" value={csrf} />
                <button type="submit" mix={ghostAction}>
                  Logout
                </button>
              </form>
            </Receipt>
          </div>
        </div>
      </AppShell>
    )
  }
}
