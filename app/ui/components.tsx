import { css } from 'remix/ui'
import type { Handle, RemixNode } from 'remix/ui'

import { formatCents } from '../utils/cents.ts'
import {
  actionStack,
  cellLabel,
  displayTitle,
  emptyMark,
  emptyState,
  labelStyle,
  lead as leadStyle,
  money,
  moneyField,
  moneyFieldWrap,
  moneyFlat,

  moneyGain,
  moneyLg,
  moneyLoss,
  moneyMd,
  numericCell,
  receipt,
  receiptSunk,
  sectionLabel,
  stampBadge,
  stampGain,
  stampGold,
  stampLoss,
  stampNeutral,
  stampUpright,
  stubInner,
  stubOuter,
  subheading,
} from './styles.ts'

/* ---------------------------------------------------------------------------
 * Fliptrack UI kit — "Elevated Receipt"
 *
 * Presentation only. Nothing here reads or writes the Books; every component
 * takes already-computed values and prints them onto paper.
 * ------------------------------------------------------------------------- */

/* ------------------------------- Surfaces -------------------------------- */

/** A plain paper receipt: hairline ink border, paper grain, layered shadow. */
export function Receipt(handle: Handle<{ sunk?: boolean; children?: RemixNode }>) {
  return () => {
    let { sunk, children } = handle.props
    return <div mix={sunk ? [receipt, receiptSunk] : receipt}>{children}</div>
  }
}

/**
 * The hero surface: a torn stub with perforated top and bottom edges. The
 * silhouette comes from a mask, so the shadow has to live on the wrapper —
 * `filter: drop-shadow` follows the masked alpha, `box-shadow` would not.
 */
export function Stub(handle: Handle<{ children?: RemixNode }>) {
  return () => (
    <div mix={stubOuter}>
      <div mix={stubInner}>{handle.props.children}</div>
    </div>
  )
}

/* -------------------------------- Money ---------------------------------- */

export type MoneyTone = 'auto' | 'flat' | 'gain' | 'loss'
export type MoneySize = 'sm' | 'md' | 'lg'

function moneyToneStyle(cents: number, tone: MoneyTone) {
  if (tone === 'gain') return moneyGain
  if (tone === 'loss') return moneyLoss
  if (tone === 'flat') return moneyFlat
  if (cents > 0) return moneyGain
  if (cents < 0) return moneyLoss
  return moneyFlat
}

const MONEY_SIZE = { sm: money, md: moneyMd, lg: moneyLg }

/**
 * A figure of money, set in tabular mono and coloured by its sign. `tone`
 * overrides the sign reading for amounts where up is not good — a cost is
 * neither a gain nor a loss, so costs pass `tone="flat"`.
 */
export function Money(
  handle: Handle<{ cents: number; tone?: MoneyTone; size?: MoneySize; block?: boolean }>,
) {
  return () => {
    let { cents, tone = 'auto', size = 'sm', block } = handle.props
    let styles = [MONEY_SIZE[size], moneyToneStyle(cents, tone)]
    let text = formatCents(cents)
    return block ? <p mix={styles}>{text}</p> : <span mix={styles}>{text}</span>
  }
}

/* -------------------------------- Stamps --------------------------------- */

export type StampTone = 'stamp' | 'gain' | 'loss' | 'neutral' | 'gold'

const STAMP_TONE = {
  stamp: null,
  gain: stampGain,
  loss: stampLoss,
  neutral: stampNeutral,
  gold: stampGold,
}

/** A rubber stamp: SOLD, WRITTEN-OFF, LIVE, ENDED, RETIRED, UNDONE… */
export function Stamp(
  handle: Handle<{ tone?: StampTone; upright?: boolean; children?: RemixNode }>,
) {
  return () => {
    let { tone = 'stamp', upright, children } = handle.props
    let toneStyle = STAMP_TONE[tone]
    let styles = [stampBadge]
    if (toneStyle) styles.push(toneStyle)
    if (upright) styles.push(stampUpright)
    return <span mix={styles}>{children}</span>
  }
}

/* ------------------------------- Headings -------------------------------- */

/** Page title, optional standfirst, optional stamp rail beside the title. */
export function PageHeader(
  handle: Handle<{ title: string; lead?: string; aside?: RemixNode; children?: RemixNode }>,
) {
  return () => {
    let { title, lead, aside, children } = handle.props
    return (
      <header mix={pageHeaderBlock}>
        <div mix={pageHeaderTitleRow}>
          <h1 mix={displayTitle}>{title}</h1>
          {aside ? <div mix={pageHeaderAside}>{aside}</div> : null}
        </div>
        {lead ? <p mix={leadStyle}>{lead}</p> : null}
        {children}
      </header>
    )
  }
}

/** A ruled section label — small caps with a hairline running to the margin. */
export function SectionLabel(handle: Handle<{ children?: RemixNode }>) {
  return () => <p mix={sectionLabel}>{handle.props.children}</p>
}

export function Subheading(handle: Handle<{ children?: RemixNode }>) {
  return () => <h2 mix={subheading}>{handle.props.children}</h2>
}

/* -------------------------------- Fields --------------------------------- */

/**
 * A money input: '$' printed into the gutter, figures right-aligned in mono
 * so a stacked column of them reads like a till roll.
 */
export function MoneyField(
  handle: Handle<{
    label: string
    name: string
    defaultValue?: string
    required?: boolean
    readOnly?: boolean
    id?: string
    hint?: string
  }>,
) {
  return () => {
    let { label, name, defaultValue, required, readOnly, id, hint } = handle.props
    return (
      <label mix={[labelStyle, moneyField]}>
        <span>{label}</span>
        <span mix={moneyFieldWrap}>
          <input
            type="text"
            inputMode="decimal"
            name={name}
            id={id}
            required={required}
            readOnly={readOnly}
            defaultValue={defaultValue}
            autoComplete="off"
          />
        </span>
        {hint ? <span mix={fieldHint}>{hint}</span> : null}
      </label>
    )
  }
}

/** A labelled cell in a ledger row: the label only prints on narrow screens. */
export function LedgerCell(handle: Handle<{ label: string; numeric?: boolean; children?: RemixNode }>) {
  return () => {
    let { label, numeric, children } = handle.props
    return (
      <span mix={numeric ? numericCell : undefined}>
        <span mix={cellLabel}>{label}</span>
        {children}
      </span>
    )
  }
}

/* ------------------------------ Empty state ------------------------------ */

/** A blank price tag, drawn rather than illustrated. */
export function BlankTagMark() {
  return () => (
    <span mix={emptyMark} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M26 4H41a3 3 0 0 1 3 3v15L22 44 4 26 26 4Z" strokeLinejoin="round" />
        <circle cx="35" cy="13" r="3.2" />
      </svg>
    </span>
  )
}

export function EmptyState(
  handle: Handle<{ title: string; note?: string; children?: RemixNode }>,
) {
  return () => {
    let { title, note, children } = handle.props
    return (
      <div mix={emptyState}>
        <BlankTagMark />
        <p mix={subheading}>{title}</p>
        {note ? <p>{note}</p> : null}
        {children}
      </div>
    )
  }
}

/* ------------------------------- Actions --------------------------------- */

/** A grouped cluster of actions: stacked on mobile, a wrapping row above. */
export function ActionStack(handle: Handle<{ children?: RemixNode }>) {
  return () => <div mix={actionStack}>{handle.props.children}</div>
}

/* --------------------------------- Icons --------------------------------- */
/* Hand-drawn-weight line icons for the books nav. 24px grid, currentColor. */

function icon(path: RemixNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

export function IconHome() {
  return () =>
    icon(
      <>
        <path d="M4 20V9.6L12 3.5l8 6.1V20" />
        <path d="M4 20h16" />
        <path d="M8.5 20v-6h7v6" />
      </>,
    )
}

export function IconInventory() {
  return () =>
    icon(
      <>
        <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5 3.5 16.5v-9Z" />
        <path d="M3.5 7.5 12 11.6l8.5-4.1" />
        <path d="M12 11.6v8.9" />
      </>,
    )
}

export function IconAcquisitions() {
  return () =>
    icon(
      <>
        <path d="M5 8h14l-1.2 11.2a1.6 1.6 0 0 1-1.6 1.3H7.8a1.6 1.6 0 0 1-1.6-1.3L5 8Z" />
        <path d="M9 8V6.2A3 3 0 0 1 12 3.2a3 3 0 0 1 3 3V8" />
        <path d="M12 12v5" />
        <path d="M9.5 14.5h5" />
      </>,
    )
}

export function IconListings() {
  return () =>
    icon(
      <>
        <path d="M4 4.5h11l5 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
        <path d="M15 4.5v5h5" />
        <path d="M7 13h8" />
        <path d="M7 16.5h5" />
      </>,
    )
}

export function IconAccount() {
  return () =>
    icon(
      <>
        <circle cx="12" cy="8.6" r="3.6" />
        <path d="M4.6 20a7.4 7.4 0 0 1 14.8 0" />
      </>,
    )
}

export function IconAdmin() {
  return () =>
    icon(
      <>
        <path d="M12 3.2 4.6 6v6.1c0 4.5 3.1 7.9 7.4 9.1 4.3-1.2 7.4-4.6 7.4-9.1V6L12 3.2Z" />
        <path d="m9 12 2.2 2.2L15.2 10" />
      </>,
    )
}

/* --------------------------- Local style atoms ---------------------------- */

const pageHeaderBlock = css({ margin: '0 0 1.35rem', minWidth: 0 })

const pageHeaderTitleRow = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '0.9rem',
  flexWrap: 'wrap',
})

const pageHeaderAside = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
  paddingTop: '0.4rem',
})

const fieldHint = css({
  fontSize: '0.72rem',
  fontWeight: 400,
  letterSpacing: '0.02em',
  textTransform: 'none',
  color: 'var(--muted)',
})
