import { css } from 'remix/ui'

export const FONT_DISPLAY = "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', serif"
export const FONT_BODY =
  "'Atkinson Hyperlegible', 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif"

export const tokens = css({
  '--paper': '#efe4cc',
  '--paper-dark': '#e4d4b4',
  '--ticket': '#f7efe0',
  '--ink': '#1c1610',
  '--muted': '#6b5c48',
  '--rule': '#c9b48a',
  '--stamp': '#b42318',
  '--stamp-dark': '#8d1a12',
  '--ledger': '#145c3a',
  '--danger': '#8d1a12',
  '--focus': '#1c1610',
  '& *, & *::before, & *::after': { boxSizing: 'border-box' },
  margin: 0,
  minHeight: '100vh',
  backgroundColor: 'var(--paper)',
  backgroundImage:
    'radial-gradient(rgba(28, 22, 16, 0.035) 0.6px, transparent 0.6px), linear-gradient(180deg, rgba(255,255,255,0.18), transparent 28%)',
  backgroundSize: '5px 5px, 100% 100%',
  color: 'var(--ink)',
  fontFamily: FONT_BODY,
  fontSize: '17px',
  lineHeight: 1.45,
  WebkitFontSmoothing: 'antialiased',
})

export const wordmark = css({
  fontFamily: FONT_DISPLAY,
  fontWeight: 600,
  fontSize: '1.35rem',
  letterSpacing: '-0.03em',
  color: 'var(--ink)',
  textDecoration: 'none',
})

export const page = css({
  width: 'min(42rem, calc(100% - 2rem))',
  margin: '0 auto',
  padding: '1.25rem 0 7rem',
})

export const fieldStack = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
})

export const labelStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  fontSize: '0.82rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  '& input, & textarea': {
    fontFamily: FONT_BODY,
    fontSize: '1.05rem',
    fontWeight: 400,
    letterSpacing: 0,
    textTransform: 'none',
    color: 'var(--ink)',
    background: 'var(--ticket)',
    border: '1px solid var(--rule)',
    borderRadius: '2px',
    minHeight: '3rem',
    padding: '0.7rem 0.8rem',
    width: '100%',
    '&:focus': {
      outline: '2px solid var(--ink)',
      outlineOffset: '2px',
    },
  },
  '& textarea': {
    minHeight: '5.5rem',
    resize: 'vertical',
  },
})

export const errorBanner = css({
  background: '#f3d2c8',
  border: '1px solid var(--stamp)',
  color: 'var(--danger)',
  padding: '0.75rem 0.9rem',
  fontSize: '0.95rem',
})

export const ticket = css({
  background: 'var(--ticket)',
  border: '1px solid var(--rule)',
  boxShadow: '4px 4px 0 rgba(28, 22, 16, 0.08)',
  padding: '1.25rem 1.15rem 1.4rem',
})

export const stampAmount = css({
  fontFamily: FONT_DISPLAY,
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  letterSpacing: '-0.04em',
  color: 'var(--ledger)',
  lineHeight: 0.95,
})

export const bottomNav = css({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  background: 'var(--paper-dark)',
  borderTop: '1px solid var(--rule)',
  zIndex: 5,
  '& a': {
    textAlign: 'center',
    padding: '0.85rem 0.4rem 1.05rem',
    color: 'var(--ink)',
    textDecoration: 'none',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  '& a[aria-current="page"]': {
    boxShadow: 'inset 0 3px 0 var(--stamp)',
  },
})

export const primaryAction = css({
  display: 'block',
  width: '100%',
  textAlign: 'center',
  background: 'var(--stamp)',
  color: '#f7efe0',
  textDecoration: 'none',
  border: 0,
  fontFamily: FONT_BODY,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: '0.95rem',
  padding: '1rem 1.1rem',
  minHeight: '3.25rem',
  cursor: 'pointer',
  '&:hover, &:focus-visible': {
    background: 'var(--stamp-dark)',
    outline: 'none',
  },
})

export const heading = css({
  fontSize: '1.8rem',
  margin: '0 0 0.6rem',
})

export const lead = css({
  color: 'var(--muted)',
  marginTop: 0,
})

export const leaveRow = css({
  marginTop: '1rem',
})

export const headerBar = css({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  width: 'min(42rem, calc(100% - 2rem))',
  margin: '0 auto',
  padding: '1.1rem 0 0.4rem',
})

export const headerBarRuled = css({
  borderBottom: '1px solid var(--rule)',
})

export const profitGrid = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '0.65rem',
  marginBottom: '1rem',
})

export const sectionLabel = css({
  margin: 0,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--muted)',
})

export const stampLabel = css({
  margin: 0,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--muted)',
})

export const inventoryValue = css({
  fontSize: '2.4rem',
  margin: '0.35rem 0 0',
})

export const windowValue = css({
  fontSize: '1.65rem',
  margin: '0.4rem 0 0',
})

export const mutedNote = css({
  margin: '0.2rem 0 0',
  color: 'var(--muted)',
  fontSize: '0.95rem',
})

export const ctaRow = css({
  margin: '1.25rem 0 0',
})

export const inventoryList = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.5rem',
})

export const inventoryItem = css({
  background: 'var(--ticket)',
  border: '1px solid var(--rule)',
  padding: '0.9rem 1rem',
  fontSize: '1.1rem',
})

export const ghostAction = css({
  display: 'inline-block',
  background: 'transparent',
  color: 'var(--ink)',
  border: '1px solid var(--ink)',
  fontFamily: FONT_BODY,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: '0.85rem',
  padding: '0.85rem 1rem',
  minHeight: '3rem',
  cursor: 'pointer',
  textDecoration: 'none',
  textAlign: 'center',
})
