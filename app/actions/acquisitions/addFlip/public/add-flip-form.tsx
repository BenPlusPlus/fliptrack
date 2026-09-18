import { clientEntry, css, on, ref, type Handle } from 'remix/ui'

import { ActionStack, Money, MoneyField, PageHeader, Receipt, SectionLabel } from '../../../../ui/components.tsx'
import {
  FONT_MONEY,
  errorBanner,
  fieldGrid,
  fieldWide,
  ghostAction,
  labelStyle,
  priceTag,
  primaryAction,
  revealStagger,
  tagRail,
} from '../../../../ui/styles.ts'
import { parseCents } from '../../../../utils/cents.ts'
import { uniqueTagNames } from './tag-names.ts'

export const SITTING_PHONE_CAP = 3
export const SITTING_DESK_CAP = 5
const NETWORK_ERROR = 'Couldn’t save. Try again.'

export type SittingFlip = { id: string; name: string; itemCost: number }

export type AddFlipFormProps = {
  csrf: string
  action: string
  leaveHref: string
  inspecting: boolean
  tagNames: string[]
  acquisitionDate: string
  acquisitionNotes: string | null
  sittingFlips: SittingFlip[]
  sittingTotal?: number
  trackSitting?: boolean
  revealSitting?: boolean
  lastTags?: string[]
  error?: string
  values?: { name: string; notes: string; itemCost: string; tag?: string }
}

type VisibleFlip = SittingFlip & { deal: boolean }

export const AddFlipForm = clientEntry(
  `${import.meta.url}#AddFlipForm`,
  function AddFlipForm(handle: Handle<AddFlipFormProps>) {
    let firstLand = handle.props.error == null && handle.props.values == null
    let saving = false
    let error = handle.props.error
    let reveal = handle.props.revealSitting === true
    let sittingTotal = handle.props.sittingTotal ?? handle.props.sittingFlips.length
    let trackSitting = handle.props.trackSitting !== false
    let sittingFlips: VisibleFlip[] = handle.props.sittingFlips.map((flip) => ({
      ...flip,
      deal: false,
    }))
    let nameInput: HTMLInputElement | undefined
    let tagInput: HTMLInputElement | undefined
    let chips: string[] = []
    let chipAdder = false

    function addChip(from: HTMLInputElement | undefined) {
      if (!from || saving || handle.props.inspecting) return
      let next = uniqueTagNames([...chips, from.value])
      from.value = ''
      if (next.length === chips.length) return
      chips = next
      handle.update()
    }

    function removeChip(name: string) {
      if (saving || handle.props.inspecting) return
      chips = chips.filter((chip) => chip.toLowerCase() !== name.toLowerCase())
      handle.update()
    }

    async function onSubmit(
      event: SubmitEvent & { currentTarget: HTMLFormElement },
      signal: AbortSignal,
    ) {
      event.preventDefault()
      if (saving || handle.props.inspecting) return

      let form = event.currentTarget
      let formData = new FormData(form)
      let typedName = String(formData.get('name') ?? '').trim()
      let typedCost = String(formData.get('item_cost') ?? '')
      let submittedTags = uniqueTagNames([...chips, formData.get('tag')])
      formData.delete('tag')
      for (let tagName of submittedTags) {
        formData.append('tag', tagName)
      }

      saving = true
      error = undefined
      await handle.update()
      if (signal.aborted) return

      let response: Response
      try {
        response = await fetch(handle.props.action, {
          method: 'POST',
          body: formData,
          redirect: 'manual',
          signal,
        })
      } catch {
        if (signal.aborted) return
        saving = false
        error = NETWORK_ERROR
        await handle.update()
        return
      }

      if (signal.aborted) return

      if (response.status === 204) {
        chips = trackSitting ? submittedTags : []
        if (trackSitting) {
          let parsed = parseCents(typedCost)
          for (let flip of sittingFlips) flip.deal = false
          sittingFlips = [
            {
              id: crypto.randomUUID(),
              name: typedName,
              itemCost: parsed.ok ? parsed.cents : 0,
              deal: true,
            },
            ...sittingFlips,
          ].slice(0, SITTING_DESK_CAP)
          sittingTotal += 1
          reveal = false
        }
        saving = false
        error = undefined
        clearFlipFields(form)
        await handle.update()
        nameInput?.focus()
        return
      }

      saving = false
      if (response.status === 400) {
        error = (await errorFromHtml(response)) ?? NETWORK_ERROR
      } else {
        error = NETWORK_ERROR
      }
      await handle.update()
    }

    return () => {
      let { csrf, action, leaveHref, inspecting, tagNames, acquisitionDate, acquisitionNotes, values } =
        handle.props
      let showStrip = sittingFlips.length > 0
      let header = (
        <PageHeader title="Add a Flip">
          <div mix={firstLand ? [dateLine, dateLineEnter] : dateLine}>
            <time dateTime={acquisitionDate} mix={dateLineDate}>
              {acquisitionDate}
            </time>
            {acquisitionNotes ? <p mix={dateLineNotes}>{acquisitionNotes}</p> : null}
          </div>
        </PageHeader>
      )

      let form = (
        <>
          {error ? (
            <p mix={errorBanner} role="alert">
              {error}
            </p>
          ) : null}
          <Receipt>
            <form
              method="post"
              action={action}
              mix={on<HTMLFormElement, 'submit'>('submit', onSubmit)}
              aria-busy={saving ? true : undefined}
            >
              <div mix={fieldGrid}>
                <input type="hidden" name="_csrf" value={csrf} />
                <label mix={[labelStyle, fieldWide]}>
                  Flip name
                  <input
                    type="text"
                    name="name"
                    required
                    autoFocus={firstLand ? true : undefined}
                    defaultValue={values?.name ?? ''}
                    autoComplete="off"
                    readOnly={saving}
                    mix={ref((node) => {
                      if (node instanceof HTMLInputElement) nameInput = node
                    })}
                  />
                </label>
                <MoneyField
                  label="Item cost"
                  name="item_cost"
                  required
                  defaultValue={values?.itemCost}
                  readOnly={saving}
                />
                <div mix={labelStyle}>
                  Tag
                  {chipAdder && chips.length > 0 ? (
                    <ul mix={tagRail}>
                      {chips.map((name) => (
                        <li key={name} mix={priceTag}>
                          {name}
                          {inspecting ? null : (
                            <button
                              type="button"
                              aria-label={`Remove ${name}`}
                              disabled={saving}
                              mix={on('click', () => removeChip(name))}
                            >
                              ×
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div mix={tagAddRow}>
                    <input
                      type="text"
                      name="tag"
                      list="tag-names"
                      autoComplete="off"
                      aria-label="Tag"
                      defaultValue={
                        values?.tag ?? (chipAdder ? '' : (handle.props.lastTags?.[0] ?? ''))
                      }
                      readOnly={saving}
                      mix={[
                        ref((node) => {
                          if (!(node instanceof HTMLInputElement)) return
                          tagInput = node
                          if (chipAdder) return
                          chipAdder = true
                          chips = uniqueTagNames(handle.props.lastTags ?? [])
                          if (chips.length > 0 && handle.props.values?.tag == null) {
                            node.value = ''
                          }
                          handle.update()
                        }),
                        on('keydown', (event) => {
                          if (event.key !== 'Enter' || event.isComposing) return
                          event.preventDefault()
                          addChip(event.currentTarget)
                        }),
                      ]}
                    />
                    {chipAdder && !inspecting ? (
                      <button
                        type="button"
                        disabled={saving}
                        mix={[ghostAction, tagAddButton, on('click', () => addChip(tagInput))]}
                      >
                        Add
                      </button>
                    ) : null}
                  </div>
                </div>
                <label mix={[labelStyle, fieldWide]}>
                  Flip notes
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={values?.notes ?? ''}
                    readOnly={saving}
                  ></textarea>
                </label>
                <datalist id="tag-names">
                  {tagNames.map((name) => (
                    <option key={name} value={name}></option>
                  ))}
                </datalist>
                <ActionStack>
                  {inspecting ? null : (
                    <button
                      type="submit"
                      mix={saving ? [primaryAction, saveBusy] : primaryAction}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save Flip'}
                    </button>
                  )}
                  <a href={leaveHref} mix={ghostAction}>
                    Leave
                  </a>
                </ActionStack>
              </div>
            </form>
          </Receipt>
        </>
      )

      if (!showStrip) {
        return (
          <>
            {header}
            {form}
          </>
        )
      }

      return (
        <div mix={addFlipLayout}>
          <div mix={addFlipHead}>{header}</div>
          <SittingStrip flips={sittingFlips} total={sittingTotal} reveal={reveal} />
          <div mix={addFlipForm}>{form}</div>
        </div>
      )
    }
  },
)

function SittingStrip(handle: { props: { flips: VisibleFlip[]; total: number; reveal: boolean } }) {
  return () => {
    let { flips, total, reveal } = handle.props
    let visible = flips.slice(0, SITTING_DESK_CAP)
    let phoneMore = total - SITTING_PHONE_CAP
    let deskMore = total - SITTING_DESK_CAP

    return (
      <section mix={addFlipStrip}>
        <SectionLabel>This sitting</SectionLabel>
        <ol mix={reveal ? [sittingList, revealStagger] : sittingList}>
          {visible.map((flip) => (
            <li key={flip.id} mix={flip.deal ? [sittingRow, sittingRowDeal] : sittingRow}>
              <span mix={sittingName}>{flip.name}</span>
              <Money cents={flip.itemCost} tone="flat" />
            </li>
          ))}
        </ol>
        {phoneMore > 0 ? <p mix={sittingMorePhone}>{phoneMore} more</p> : null}
        {deskMore > 0 ? <p mix={sittingMoreDesk}>{deskMore} more</p> : null}
      </section>
    )
  }
}

async function errorFromHtml(response: Response): Promise<string | null> {
  let html = await response.text()
  let alert = new DOMParser().parseFromString(html, 'text/html').querySelector('[role="alert"]')
  let text = alert?.textContent?.trim()
  return text ? text : null
}

function clearFlipFields(form: HTMLFormElement) {
  for (let element of form.elements) {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) continue
    if (element.type === 'hidden') continue
    element.value = ''
  }
}

const tagAddRow = css({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '0.45rem',
  alignItems: 'stretch',
  minWidth: 0,
})

const tagAddButton = css({
  paddingLeft: '0.9rem',
  paddingRight: '0.9rem',
})

const saveBusy = css({
  transform: 'translateY(2px)',
  boxShadow: '0 0 0 var(--stamp-dark)',
  '&:hover': { background: 'var(--stamp)' },
  '&&:disabled': {
    opacity: 1,
    cursor: 'default',
    transform: 'translateY(2px)',
    boxShadow: '0 0 0 var(--stamp-dark)',
  },
})

const sittingRowDeal = css({
  animation: 'ft-deal 420ms cubic-bezier(0.22, 0.9, 0.3, 1) both',
})

const dateLine = css({
  display: 'grid',
  gap: '0.2rem 1rem',
  margin: '0.1rem 0 0',
  minWidth: 0,
  '@media (min-width: 48rem)': {
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'start',
  },
})

const dateLineEnter = css({
  animation: 'ft-rise 220ms ease both',
})

const dateLineDate = css({
  fontFamily: FONT_MONEY,
  fontVariantNumeric: 'tabular-nums',
  fontSize: '0.78rem',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
  lineHeight: 1.4,
})

const dateLineNotes = css({
  margin: 0,
  color: 'var(--muted)',
  fontSize: '0.93rem',
  lineHeight: 1.4,
  minWidth: 0,
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: '2',
  lineClamp: '2',
  overflow: 'hidden',
})

const addFlipLayout = css({
  display: 'grid',
  gap: '1.1rem',
  minWidth: 0,
  gridTemplateAreas: `
    "head"
    "strip"
    "form"
  `,
  '@media (min-width: 64rem)': {
    gridTemplateColumns: 'minmax(0, 15rem) minmax(0, 1fr)',
    gap: '1.75rem',
    alignItems: 'start',
    gridTemplateAreas: `
      "strip head"
      "strip form"
    `,
  },
})

const addFlipHead = css({ gridArea: 'head', minWidth: 0 })
const addFlipStrip = css({ gridArea: 'strip', minWidth: 0 })
const addFlipForm = css({ gridArea: 'form', minWidth: 0 })

const sittingList = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  [`& > li:nth-child(n+${SITTING_PHONE_CAP + 1})`]: { display: 'none' },
  '@media (min-width: 64rem)': {
    [`& > li:nth-child(n+${SITTING_PHONE_CAP + 1})`]: { display: 'grid' },
    [`& > li:nth-child(n+${SITTING_DESK_CAP + 1})`]: { display: 'none' },
  },
})

const sittingRow = css({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '0.7rem',
  alignItems: 'baseline',
  padding: '0.5rem 0',
  borderBottom: '1px dashed var(--rule)',
  minWidth: 0,
})

const sittingName = css({
  minWidth: 0,
  overflowWrap: 'anywhere',
  fontWeight: 700,
})

const sittingMore = {
  margin: '0.5rem 0 0',
  color: 'var(--muted)',
  fontSize: '0.85rem',
}

const sittingMorePhone = css({
  ...sittingMore,
  '@media (min-width: 64rem)': { display: 'none' },
})

const sittingMoreDesk = css({
  ...sittingMore,
  display: 'none',
  '@media (min-width: 64rem)': { display: 'block' },
})
