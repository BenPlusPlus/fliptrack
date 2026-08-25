import { css } from 'remix/ui'

/* ---------------------------------------------------------------------------
 * Fliptrack — "Elevated Receipt"
 *
 * The app is a shoebox of thrift-store receipts, price tags, and a hand-kept
 * ledger. Three type roles: a wonky display serif for voice, a hyperlegible
 * sans for prose, and a mechanical mono for every figure of money.
 * ------------------------------------------------------------------------- */

export const FONT_DISPLAY =
  "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"
export const FONT_BODY =
  "'Atkinson Hyperlegible', 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif"
export const FONT_MONEY =
  "'Martian Mono', ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace"

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Atkinson+Hyperlegible:wght@400;700' +
  '&family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..900,0..100,0..1' +
  '&family=Martian+Mono:wght@400..700' +
  '&display=swap'

export const THEME_COLOR = '#ece1cd'

/* Breakpoints. Mobile is the base; everything else is an addition. */
const TABLET_UP = '@media (min-width: 48rem)'
const DESKTOP_UP = '@media (min-width: 64rem)'
const WIDE_UP = '@media (min-width: 82rem)'
const MOBILE_ONLY = '@media (max-width: 47.999rem)'
const RAIL_ONLY = '@media (min-width: 48rem) and (max-width: 63.999rem)'

export const BREAKPOINTS = { TABLET_UP, DESKTOP_UP, WIDE_UP, MOBILE_ONLY, RAIL_ONLY }

/* Paper fibre. An feTurbulence tile, desaturated, multiplied over the ground. */
const PAPER_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23f)' opacity='0.42'/%3E%3C/svg%3E\")"

/* ---------------------------------------------------------------------------
 * Global stylesheet — keyframes, resets and print rules that do not belong to
 * any single element. Rendered as a raw <style> by Document.
 * ------------------------------------------------------------------------- */

export const globalCss = `
@layer ft-base, rmx;
@layer ft-base {
  a { color: #8f2413; text-decoration-thickness: 1px; text-underline-offset: 0.18em; text-decoration-color: rgba(143,36,19,0.4); }
  a:hover { text-decoration-color: currentColor; }
}
@keyframes ft-deal {
  from { opacity: 0; transform: translateY(10px) rotate(-0.35deg); }
  to   { opacity: 1; transform: none; }
}
@keyframes ft-stamp-in {
  0%   { opacity: 0; transform: scale(1.5) rotate(-12deg); }
  60%  { opacity: 1; transform: scale(0.94) rotate(-3deg); }
  100% { opacity: 1; transform: scale(1) rotate(-4deg); }
}
@keyframes ft-rise {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
html { -webkit-text-size-adjust: 100%; }
::selection { background: #f3c9a8; color: #221a12; }
:focus-visible { outline: 3px solid #c2381f; outline-offset: 2px; border-radius: 1px; }
input::placeholder, textarea::placeholder { color: #79694f; opacity: 0.75; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.001ms !important;
  }
}
@media print {
  body { background: #fff !important; }
  nav, .ft-no-print { display: none !important; }
}
`

/* ---------------------------------------------------------------------------
 * Ground
 * ------------------------------------------------------------------------- */

export const tokens = css({
  '--paper': '#ece1cd',
  '--paper-deep': '#e0d2b4',
  '--paper-dark': '#e0d2b4',
  '--card': '#fbf6ea',
  '--card-sunk': '#f4ebd8',
  '--ticket': '#fbf6ea',

  '--ink': '#221a12',
  '--ink-soft': '#4a3c2c',
  '--muted': '#79694f',
  '--rule': '#cbb894',
  '--rule-soft': '#e2d4b6',

  '--stamp': '#c2381f',
  '--stamp-dark': '#8f2413',
  '--gain': '#1c6647',
  '--ledger': '#1c6647',
  '--loss': '#a63118',
  '--danger': '#a63118',
  '--gold': '#a8791f',
  '--focus': '#c2381f',

  '--shadow-paper':
    '0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 1px rgba(34,26,18,0.10), 0 10px 20px -12px rgba(34,26,18,0.42)',
  '--shadow-lift':
    '0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 3px rgba(34,26,18,0.12), 0 18px 34px -16px rgba(34,26,18,0.48)',

  '& *, & *::before, & *::after': { boxSizing: 'border-box' },

  margin: 0,
  minHeight: '100vh',
  backgroundColor: 'var(--paper)',
  backgroundImage: `${PAPER_NOISE}, radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.55), transparent 62%)`,
  backgroundBlendMode: 'multiply, normal',
  backgroundAttachment: 'fixed, fixed',
  color: 'var(--ink)',
  fontFamily: FONT_BODY,
  fontSize: '17px',
  lineHeight: 1.5,
  WebkitFontSmoothing: 'antialiased',
  textRendering: 'optimizeLegibility',
})

/* ---------------------------------------------------------------------------
 * Shell layout
 * ------------------------------------------------------------------------- */

export const appFrame = css({
  minHeight: '100vh',
  [TABLET_UP]: {
    display: 'grid',
    gridTemplateColumns: '4.75rem minmax(0, 1fr)',
    alignItems: 'start',
  },
  [DESKTOP_UP]: {
    gridTemplateColumns: '16rem minmax(0, 1fr)',
  },
})

export const appMain = css({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
})

export const contentColumn = css({
  width: 'min(44rem, calc(100% - 2rem))',
  margin: '0 auto',
  padding: '1rem 0 7.5rem',
  [TABLET_UP]: {
    width: 'min(46rem, calc(100% - 3rem))',
    padding: '1.25rem 0 4rem',
  },
  [DESKTOP_UP]: {
    width: 'min(68rem, calc(100% - 4rem))',
    padding: '1.5rem 0 5rem',
  },
  [WIDE_UP]: {
    width: 'min(74rem, calc(100% - 5rem))',
  },
})

/* Focus mode (nav hidden): a deliberately narrow, centred column so a single
 * form receipt does not sprawl across a 1440px screen. */
export const focusColumn = css({
  width: 'min(44rem, calc(100% - 2rem))',
  margin: '0 auto',
  padding: '1rem 0 4rem',
  [TABLET_UP]: { width: 'min(40rem, calc(100% - 3rem))', padding: '2rem 0 5rem' },
  [DESKTOP_UP]: { width: 'min(42rem, calc(100% - 4rem))', padding: '3rem 0 6rem' },
})

/* Kept for compatibility with any view not yet migrated. */
export const page = contentColumn

/* Top bar. On mobile it carries the wordmark; on desktop the wordmark moves
 * into the sidebar and this becomes a page-title + actions bar. */
export const topBar = css({
  position: 'sticky',
  top: 0,
  zIndex: 6,
  backgroundColor: 'rgba(236,225,205,0.88)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderBottom: '1px solid var(--rule)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset',
})

export const topBarInner = css({
  width: 'min(44rem, calc(100% - 2rem))',
  margin: '0 auto',
  minHeight: '3.4rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  [TABLET_UP]: { width: 'min(46rem, calc(100% - 3rem))', minHeight: '3.75rem' },
  [DESKTOP_UP]: { width: 'min(68rem, calc(100% - 4rem))' },
  [WIDE_UP]: { width: 'min(74rem, calc(100% - 5rem))' },
})

export const headerBar = topBarInner
export const headerBarRuled = css({})

export const wordmark = css({
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '0.35rem',
  fontFamily: FONT_DISPLAY,
  fontWeight: 900,
  fontVariationSettings: "'opsz' 144, 'SOFT' 60, 'WONK' 1",
  fontSize: '1.4rem',
  letterSpacing: '-0.035em',
  color: 'var(--ink)',
  textDecoration: 'none',
  '&::after': {
    content: '""',
    width: '0.4rem',
    height: '0.4rem',
    borderRadius: '50%',
    background: 'var(--stamp)',
  },
})

export const topBarTitle = css({
  fontFamily: FONT_DISPLAY,
  fontWeight: 900,
  fontVariationSettings: "'opsz' 144, 'SOFT' 40, 'WONK' 1",
  fontSize: '1.15rem',
  letterSpacing: '-0.02em',
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

export const topBarActions = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexShrink: 0,
})

export const hideOnMobile = css({ [MOBILE_ONLY]: { display: 'none' } })
export const hideOnDesktop = css({ [TABLET_UP]: { display: 'none' } })

/* ---------------------------------------------------------------------------
 * Books navigation — bottom ticket-stub strip → icon rail → sidebar
 * ------------------------------------------------------------------------- */

export const navRoot = css({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 7,
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  background: 'var(--paper-deep)',
  backgroundImage: PAPER_NOISE,
  backgroundBlendMode: 'multiply',
  borderTop: '1px solid var(--rule)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  /* perforated tear line along the top edge */
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    right: 0,
    top: '-7px',
    height: '7px',
    backgroundImage:
      'radial-gradient(circle at 6px 7px, transparent 4.5px, var(--paper-deep) 5px)',
    backgroundSize: '12px 7px',
    backgroundRepeat: 'repeat-x',
  },

  [TABLET_UP]: {
    position: 'sticky',
    top: 0,
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    padding: '0.9rem 0.5rem',
    borderTop: 0,
    borderRight: '1px solid var(--rule)',
    '&::before': { display: 'none' },
  },
  [DESKTOP_UP]: {
    padding: '1.4rem 0.9rem',
  },
})

export const navBrand = css({
  display: 'none',
  [TABLET_UP]: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 0 1.2rem',
    marginBottom: '0.6rem',
    borderBottom: '1px dashed var(--rule)',
  },
  [DESKTOP_UP]: { justifyContent: 'flex-start', padding: '0 0.6rem 1.3rem' },
})

export const navLink = css({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.2rem',
  padding: '0.6rem 0.15rem 0.7rem',
  color: 'var(--ink-soft)',
  textDecoration: 'none',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  transition: 'color 140ms ease, background-color 140ms ease',
  '& svg': { width: '1.35rem', height: '1.35rem', display: 'block' },
  '&:hover': { color: 'var(--ink)' },
  '&[aria-current="page"]': {
    color: 'var(--stamp)',
  },
  '&[aria-current="page"]::after': {
    content: '""',
    position: 'absolute',
    left: '22%',
    right: '22%',
    top: 0,
    height: '3px',
    background: 'var(--stamp)',
  },

  [TABLET_UP]: {
    borderRadius: '3px',
    padding: '0.7rem 0.3rem',
    '&:hover': { backgroundColor: 'rgba(34,26,18,0.06)' },
    '&[aria-current="page"]': { backgroundColor: 'rgba(194,56,31,0.12)' },
    '&[aria-current="page"]::after': {
      left: 0,
      right: 'auto',
      top: '18%',
      bottom: '18%',
      height: 'auto',
      width: '3px',
    },
  },
  [RAIL_ONLY]: {
    '& span': { fontSize: '0.53rem', letterSpacing: '0.02em' },
  },
  [DESKTOP_UP]: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: '0.7rem',
    padding: '0.62rem 0.7rem',
    fontSize: '0.78rem',
    letterSpacing: '0.05em',
  },
})

export const navSpacer = css({
  display: 'none',
  [TABLET_UP]: { display: 'block', flex: 1 },
})

export const navFooter = css({
  display: 'none',
  [TABLET_UP]: {
    display: 'block',
    paddingTop: '0.8rem',
    marginTop: '0.5rem',
    borderTop: '1px dashed var(--rule)',
    fontSize: '0.66rem',
    color: 'var(--muted)',
    textAlign: 'center',
    overflowWrap: 'anywhere',
  },
  [DESKTOP_UP]: { textAlign: 'left', padding: '0.8rem 0.7rem 0' },
})

/* Legacy aliases so unmigrated views keep compiling. */
export const bottomNav = navRoot
export const bottomNavAdmin = css({})

/* ---------------------------------------------------------------------------
 * Surfaces — receipts
 * ------------------------------------------------------------------------- */

export const receipt = css({
  position: 'relative',
  background: 'var(--card)',
  backgroundImage: PAPER_NOISE,
  backgroundBlendMode: 'multiply',
  border: '1px solid var(--rule)',
  borderRadius: '2px',
  boxShadow: 'var(--shadow-paper)',
  padding: '1.1rem 1.05rem 1.2rem',
  minWidth: 0,
  [TABLET_UP]: { padding: '1.35rem 1.4rem 1.45rem' },
})

/* The hero surface: a torn stub with perforated top and bottom edges. The
 * drop-shadow lives on the wrapper so it follows the perforated silhouette. */
export const stubOuter = css({
  filter: 'drop-shadow(0 2px 2px rgba(34,26,18,0.14)) drop-shadow(0 14px 22px rgba(34,26,18,0.20))',
  minWidth: 0,
})

export const stubInner = css({
  position: 'relative',
  display: 'block',
  background: 'var(--card)',
  backgroundImage: PAPER_NOISE,
  backgroundBlendMode: 'multiply',
  padding: '1.05rem 0.9rem 1.15rem',
  WebkitMaskImage:
    'radial-gradient(circle at 6px 0, transparent 4.6px, #000 5.1px), radial-gradient(circle at 6px 100%, transparent 4.6px, #000 5.1px)',
  WebkitMaskSize: '12px 100%, 12px 100%',
  WebkitMaskPosition: 'top left, bottom left',
  WebkitMaskRepeat: 'repeat-x, repeat-x',
  WebkitMaskComposite: 'source-in',
  maskImage:
    'radial-gradient(circle at 6px 0, transparent 4.6px, #000 5.1px), radial-gradient(circle at 6px 100%, transparent 4.6px, #000 5.1px)',
  maskSize: '12px 100%, 12px 100%',
  maskPosition: 'top left, bottom left',
  maskRepeat: 'repeat-x, repeat-x',
  maskComposite: 'intersect',
  [TABLET_UP]: { padding: '1.25rem 1.25rem 1.35rem' },
})

/* Legacy name, now the plain receipt. */
export const ticket = receipt

export const receiptSunk = css({
  background: 'var(--card-sunk)',
  border: '1px dashed var(--rule)',
  boxShadow: 'none',
})

export const dashRule = css({
  border: 0,
  borderTop: '1px dashed var(--rule)',
  margin: '1rem 0',
})

/* ---------------------------------------------------------------------------
 * Typography
 * ------------------------------------------------------------------------- */

export const displayTitle = css({
  fontFamily: FONT_DISPLAY,
  fontWeight: 900,
  fontVariationSettings: "'opsz' 144, 'SOFT' 50, 'WONK' 1",
  fontSize: 'clamp(1.85rem, 1.35rem + 2.2vw, 2.85rem)',
  lineHeight: 1.03,
  letterSpacing: '-0.035em',
  margin: '0 0 0.35rem',
  overflowWrap: 'anywhere',
})

export const heading = displayTitle

export const subheading = css({
  fontFamily: FONT_DISPLAY,
  fontWeight: 800,
  fontVariationSettings: "'opsz' 60, 'SOFT' 40, 'WONK' 0",
  fontSize: '1.28rem',
  letterSpacing: '-0.02em',
  lineHeight: 1.15,
  margin: '0 0 0.55rem',
})

export const sectionLabel = css({
  margin: '0 0 0.6rem',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.19em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  '&::after': {
    content: '""',
    flex: 1,
    height: '1px',
    background: 'var(--rule)',
  },
})

export const stampLabel = css({
  margin: 0,
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
})

export const lead = css({
  color: 'var(--ink-soft)',
  fontSize: '1.02rem',
  margin: '0 0 1rem',
  maxWidth: '46ch',
})

export const mutedNote = css({
  margin: '0.2rem 0 0',
  color: 'var(--muted)',
  fontSize: '0.93rem',
  '& a': { color: 'var(--ink)', textDecorationColor: 'var(--rule)' },
})

/* ---------------------------------------------------------------------------
 * Money — the mechanical, tabular voice
 * ------------------------------------------------------------------------- */

const moneyBase = {
  fontFamily: FONT_MONEY,
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: "'tnum' 1",
  letterSpacing: '-0.055em',
  lineHeight: 1,
  margin: 0,
  whiteSpace: 'nowrap' as const,
}

export const money = css({ ...moneyBase, fontWeight: 500, fontSize: '0.95rem' })

export const moneyMd = css({
  ...moneyBase,
  fontWeight: 600,
  fontSize: 'clamp(1.25rem, 1rem + 1.1vw, 1.7rem)',
})

export const moneyLg = css({
  ...moneyBase,
  fontWeight: 700,
  fontSize: 'clamp(2rem, 1.4rem + 3vw, 3.3rem)',
})

export const moneyGain = css({ color: 'var(--gain)' })
export const moneyLoss = css({ color: 'var(--loss)' })
export const moneyFlat = css({ color: 'var(--ink)' })

/* Legacy aliases. */
export const stampAmount = css({ ...moneyBase, fontWeight: 700, color: 'var(--ink)' })
export const inventoryValue = css({ fontSize: 'clamp(2rem, 1.4rem + 3vw, 3.3rem)' })
export const windowValue = css({ fontSize: 'clamp(1.25rem, 1rem + 1.1vw, 1.7rem)' })

/* ---------------------------------------------------------------------------
 * Rubber stamps
 * ------------------------------------------------------------------------- */

export const stampBadge = css({
  display: 'inline-block',
  fontFamily: FONT_BODY,
  fontWeight: 700,
  fontSize: '0.66rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  padding: '0.28rem 0.55rem',
  border: '2px solid currentColor',
  borderRadius: '3px',
  color: 'var(--stamp)',
  opacity: 0.88,
  transform: 'rotate(-4deg)',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
  whiteSpace: 'nowrap',
  animation: 'ft-stamp-in 340ms cubic-bezier(0.2, 1.4, 0.4, 1) both',
})

export const stampGain = css({ color: 'var(--gain)' })
export const stampLoss = css({ color: 'var(--loss)' })
export const stampNeutral = css({ color: 'var(--muted)' })
export const stampGold = css({ color: 'var(--gold)' })
export const stampUpright = css({ transform: 'none' })

/* ---------------------------------------------------------------------------
 * Controls
 * ------------------------------------------------------------------------- */

const controlBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  fontFamily: FONT_BODY,
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase' as const,
  fontSize: '0.82rem',
  padding: '0.8rem 1.15rem',
  minHeight: '3rem',
  borderRadius: '3px',
  cursor: 'pointer',
  textDecoration: 'none',
  textAlign: 'center' as const,
  transition: 'transform 90ms ease, box-shadow 90ms ease, background-color 140ms ease',
}

export const primaryAction = css({
  ...controlBase,
  width: '100%',
  background: 'var(--stamp)',
  color: '#fdf8ec',
  border: '1px solid var(--stamp-dark)',
  boxShadow: '0 2px 0 var(--stamp-dark), 0 8px 16px -8px rgba(143,36,19,0.7)',
  '&:hover': { background: 'var(--stamp-dark)' },
  '&:active': { transform: 'translateY(2px)', boxShadow: '0 0 0 var(--stamp-dark)' },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
  [TABLET_UP]: { width: 'auto', minWidth: '13rem' },
})

export const ghostAction = css({
  ...controlBase,
  background: 'var(--card)',
  color: 'var(--ink)',
  border: '1px solid var(--ink)',
  boxShadow: '0 2px 0 rgba(34,26,18,0.85)',
  '&:hover': { background: '#fffdf6' },
  '&:active': { transform: 'translateY(2px)', boxShadow: '0 0 0 rgba(34,26,18,0.85)' },
})

export const dangerAction = css({
  ...controlBase,
  background: 'transparent',
  color: 'var(--loss)',
  border: '1px dashed var(--loss)',
  boxShadow: 'none',
  '&:hover': { background: 'rgba(166,49,24,0.08)' },
})

export const quietAction = css({
  ...controlBase,
  background: 'transparent',
  color: 'var(--ink-soft)',
  border: '1px solid transparent',
  boxShadow: 'none',
  minHeight: '2.4rem',
  padding: '0.4rem 0.6rem',
  fontSize: '0.72rem',
  '&:hover': { color: 'var(--ink)', background: 'rgba(34,26,18,0.06)' },
})

export const actionStack = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  margin: '1.4rem 0 0',
  '& form': { display: 'contents' },
  [TABLET_UP]: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
})

export const ctaRow = css({
  margin: '1.4rem 0 0',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.6rem',
})

export const leaveRow = css({ margin: '1rem 0 0' })

/* ---------------------------------------------------------------------------
 * Forms
 * ------------------------------------------------------------------------- */

export const fieldStack = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.05rem',
  listStyle: 'none',
  border: 0,
  padding: 0,
  margin: 0,
  minWidth: 0,
})

export const fieldGrid = css({
  display: 'grid',
  gap: '1.05rem',
  border: 0,
  padding: 0,
  margin: 0,
  minWidth: 0,
  [TABLET_UP]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
})

export const fieldWide = css({ [TABLET_UP]: { gridColumn: '1 / -1' } })

export const labelStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  minWidth: 0,
  '& input, & textarea, & select': {
    fontFamily: FONT_BODY,
    fontSize: '1.02rem',
    fontWeight: 400,
    letterSpacing: 0,
    textTransform: 'none',
    color: 'var(--ink)',
    background: 'var(--card)',
    border: '1px solid var(--rule)',
    borderRadius: '2px',
    boxShadow: 'inset 0 2px 4px rgba(34,26,18,0.07)',
    minHeight: '3rem',
    padding: '0.7rem 0.8rem',
    width: '100%',
    transition: 'border-color 140ms ease, box-shadow 140ms ease',
  },
  '& input:hover, & textarea:hover': { borderColor: 'var(--muted)' },
  '& input:focus, & textarea:focus, & select:focus': {
    outline: 'none',
    borderColor: 'var(--stamp)',
    boxShadow: 'inset 0 2px 4px rgba(34,26,18,0.05), 0 0 0 3px rgba(194,56,31,0.22)',
  },
  '& input:not([type="checkbox"]):not([type="radio"]):read-only, & textarea:read-only': {
    background: 'var(--card-sunk)',
    color: 'var(--ink-soft)',
    cursor: 'default',
  },
  '& textarea': { minHeight: '5.5rem', resize: 'vertical', lineHeight: 1.5 },
  '& input[type="checkbox"], & input[type="radio"]': {
    width: 'auto',
    minHeight: 0,
    accentColor: 'var(--stamp)',
    boxShadow: 'none',
  },
})

/* A money input: '$' printed into the gutter, figures set in mono, right
 * aligned so a column of them lines up like a till roll. */
export const moneyField = css({
  '& input': {
    fontFamily: FONT_MONEY,
    fontVariantNumeric: 'tabular-nums',
    fontSize: '0.98rem',
    letterSpacing: '-0.04em',
    textAlign: 'right',
    paddingLeft: '2rem',
  },
})

export const moneyFieldWrap = css({
  position: 'relative',
  display: 'block',
  minWidth: 0,
  '&::before': {
    content: '"$"',
    position: 'absolute',
    left: '0.8rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontFamily: FONT_MONEY,
    fontSize: '0.92rem',
    fontWeight: 600,
    color: 'var(--muted)',
    pointerEvents: 'none',
    zIndex: 1,
  },
})

export const checkLabel = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.95rem',
  fontWeight: 400,
  letterSpacing: 0,
  textTransform: 'none',
  color: 'var(--ink)',
  cursor: 'pointer',
  padding: '0.35rem 0.7rem',
  border: '1px solid var(--rule)',
  borderRadius: '999px',
  background: 'var(--card)',
  '&:hover': { borderColor: 'var(--ink)' },
  '& input': { accentColor: 'var(--stamp)', margin: 0 },
})

// Full-width checkbox row: used where the checkbox already sits inside a bordered
// list row, so it must not draw a second pill-shaped box of its own.
export const checkRow = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.7rem',
  width: '100%',
  fontSize: '0.98rem',
  fontWeight: 400,
  letterSpacing: 0,
  textTransform: 'none',
  color: 'var(--ink)',
  cursor: 'pointer',
  '& input': {
    accentColor: 'var(--stamp)',
    margin: 0,
    width: '1.05rem',
    height: '1.05rem',
    flexShrink: 0,
  },
})

export const fieldsetReset = css({ border: 0, padding: 0, margin: 0, minWidth: 0 })
/* ---------------------------------------------------------------------------
 * Banners
 * ------------------------------------------------------------------------- */

export const errorBanner = css({
  background: '#f7ded1',
  border: '1px solid var(--loss)',
  borderLeft: '5px solid var(--loss)',
  borderRadius: '2px',
  color: '#6d1f0e',
  padding: '0.8rem 1rem',
  margin: '0 0 1rem',
  fontSize: '0.97rem',
  boxShadow: '0 6px 14px -10px rgba(166,49,24,0.7)',
  animation: 'ft-rise 220ms ease both',
})

export const inspectBanner = css({
  background: 'repeating-linear-gradient(135deg, #f7e4cf 0 10px, #f2dbc2 10px 20px)',
  border: '1px solid var(--gold)',
  borderRadius: '2px',
  color: '#5d4210',
  padding: '0.7rem 0.95rem',
  margin: '0 0 1.25rem',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '0.92rem',
  '& button': {
    background: 'transparent',
    color: '#5d4210',
    border: '1px solid #5d4210',
    borderRadius: '2px',
    fontFamily: FONT_BODY,
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    fontSize: '0.7rem',
    padding: '0.45rem 0.7rem',
    cursor: 'pointer',
  },
  '& button:hover': { background: 'rgba(93,66,16,0.12)' },
})

/* ---------------------------------------------------------------------------
 * Ledger lists and tables
 * ------------------------------------------------------------------------- */

export const ledgerList = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.5rem',
})

export const inventoryList = ledgerList

export const ledgerRow = css({
  position: 'relative',
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: '2px',
  padding: '0.8rem 0.95rem',
  fontSize: '1rem',
  minWidth: 0,
  boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 10px -8px rgba(34,26,18,0.5)',
  transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
  '& a': { color: 'var(--ink)', textDecoration: 'none', fontWeight: 700 },
  '& a:hover': { textDecoration: 'underline', textDecorationColor: 'var(--stamp)' },
  '&:hover': {
    borderColor: 'var(--muted)',
    transform: 'translateY(-1px)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 16px -10px rgba(34,26,18,0.6)',
  },
})

export const inventoryItem = ledgerRow

export const rowMain = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.7rem',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  minWidth: 0,
})

export const rowMeta = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.3rem 0.85rem',
  margin: '0.35rem 0 0',
  fontSize: '0.85rem',
  color: 'var(--muted)',
})

/* Column layout: stacked cards on mobile, aligned ledger columns above 48rem. */
export const ledgerTable = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.5rem',
  [TABLET_UP]: {
    gap: 0,
    background: 'var(--card)',
    border: '1px solid var(--rule)',
    borderRadius: '2px',
    boxShadow: 'var(--shadow-paper)',
    overflow: 'hidden',
  },
})

export const ledgerHead = css({
  display: 'none',
  [TABLET_UP]: {
    display: 'grid',
    gap: '0.75rem',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    background: 'var(--card-sunk)',
    borderBottom: '1px solid var(--rule)',
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
})

export const ledgerTableRow = css({
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: '2px',
  padding: '0.8rem 0.95rem',
  minWidth: 0,
  boxShadow: '0 4px 10px -8px rgba(34,26,18,0.5)',
  /* Below the table breakpoint the row is a card, so its cells have to stack
   * instead of running together as inline spans. */
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  [TABLET_UP]: {
    display: 'grid',
    gap: '0.75rem',
    alignItems: 'center',
    border: 0,
    borderRadius: 0,
    boxShadow: 'none',
    borderBottom: '1px solid var(--rule-soft)',
    padding: '0.7rem 1rem',
  },
  '&:last-child': { [TABLET_UP]: { borderBottom: 0 } },
  '&:nth-child(even)': { [TABLET_UP]: { background: 'rgba(203,184,148,0.10)' } },
  '&:hover': { [TABLET_UP]: { background: 'rgba(194,56,31,0.06)' } },
})

/* Ledger rows carry one primary link. It has to look like the row's headline,
 * not like body-copy link text, so the underline is reserved for hover. */
export const ledgerLink = css({
  fontFamily: FONT_DISPLAY,
  fontWeight: 800,
  fontVariationSettings: "'opsz' 60, 'SOFT' 40, 'WONK' 0",
  fontSize: '1.2rem',
  lineHeight: 1.2,
  letterSpacing: '-0.015em',
  color: 'var(--ink)',
  textDecoration: 'none',
  '&:hover': { color: 'var(--stamp-dark)', textDecoration: 'underline' },
})

export const numericCell = css({
  fontFamily: FONT_MONEY,
  fontVariantNumeric: 'tabular-nums',
  fontSize: '0.88rem',
  letterSpacing: '-0.05em',
  [TABLET_UP]: { textAlign: 'right' },
})

/* On mobile a cell prints its own label; on desktop the header supplies it. */
export const cellLabel = css({
  display: 'inline',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginRight: '0.4rem',
  fontFamily: FONT_BODY,
  [TABLET_UP]: { display: 'none' },
})

export const mobileCells = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.3rem 0.9rem',
  margin: 0,
  [TABLET_UP]: { display: 'contents' },
})

/* ---------------------------------------------------------------------------
 * Price tags
 * ------------------------------------------------------------------------- */

export const tagRail = css({
  listStyle: 'none',
  margin: '0 0 0.85rem',
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.45rem',
})

export const tagList = tagRail

export const priceTag = css({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: '3px',
  padding: '0.3rem 0.6rem 0.3rem 1.4rem',
  fontSize: '0.92rem',
  lineHeight: 1.2,
  boxShadow: '0 3px 8px -6px rgba(34,26,18,0.7)',
  /* the punch hole */
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '0.5rem',
    top: '50%',
    width: '0.42rem',
    height: '0.42rem',
    marginTop: '-0.21rem',
    borderRadius: '50%',
    background: 'var(--paper)',
    boxShadow: 'inset 0 0 0 1px var(--rule)',
  },
  '& form': { display: 'flex' },
  '& button': {
    border: 0,
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: '0 0.1rem',
    borderRadius: '2px',
  },
  '& button:hover': { color: 'var(--loss)' },
})

export const tagChip = priceTag

export const tagSection = css({ margin: '1.75rem 0' })

/* ---------------------------------------------------------------------------
 * Composition helpers
 * ------------------------------------------------------------------------- */

/* Two-column content on desktop: main body + a narrower rail. */
export const splitLayout = css({
  display: 'grid',
  gap: '1.25rem',
  alignItems: 'start',
  minWidth: 0,
  [DESKTOP_UP]: {
    gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
    gap: '1.75rem',
  },
})

export const splitLayoutEven = css({
  display: 'grid',
  gap: '1.25rem',
  alignItems: 'start',
  minWidth: 0,
  [DESKTOP_UP]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.75rem' },
})

export const stackGap = css({ display: 'grid', gap: '1.25rem', minWidth: 0 })

export const sectionBlock = css({ margin: '1.9rem 0 0', minWidth: 0 })

export const profitGrid = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '0.5rem',
  marginBottom: '1.1rem',
  [TABLET_UP]: { gap: '0.9rem' },
})

export const profitStampLink = css({
  display: 'block',
  color: 'inherit',
  textDecoration: 'none',
  transition: 'transform 130ms ease',
  '&:hover': { transform: 'translateY(-2px)' },
  '&[aria-current="true"] > * > *': {
    boxShadow: 'inset 0 5px 0 var(--stamp)',
    borderColor: 'var(--stamp)',
  },
})

/* Sticky bulk-action bar that sits above the mobile tab strip. */
export const bulkBar = css({
  position: 'sticky',
  bottom: 'calc(4.35rem + env(safe-area-inset-bottom))',
  zIndex: 4,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  margin: '1rem 0 0',
  padding: '0.7rem',
  background: 'rgba(251,246,234,0.94)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid var(--rule)',
  borderRadius: '3px',
  boxShadow: 'var(--shadow-lift)',
  '& > *': { flex: '1 1 8rem' },
  [TABLET_UP]: {
    position: 'static',
    background: 'transparent',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: 0,
    boxShadow: 'none',
    padding: 0,
    '& > *': { flex: '0 0 auto' },
  },
})

/* Segment tabs drawn as torn stubs. */
export const segmentBar = css({
  display: 'flex',
  gap: '0.3rem',
  margin: '0 0 1.1rem',
  padding: '0.25rem',
  background: 'rgba(203,184,148,0.28)',
  border: '1px solid var(--rule)',
  borderRadius: '3px',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  [TABLET_UP]: { display: 'inline-flex' },
})

export const segmentTab = css({
  flex: '1 0 auto',
  textAlign: 'center',
  padding: '0.55rem 0.9rem',
  borderRadius: '2px',
  color: 'var(--ink-soft)',
  textDecoration: 'none',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.11em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  '&:hover': { color: 'var(--ink)' },
  '&[aria-current="page"]': {
    background: 'var(--card)',
    color: 'var(--stamp)',
    boxShadow: '0 1px 3px rgba(34,26,18,0.2)',
  },
})

export const emptyState = css({
  display: 'grid',
  justifyItems: 'center',
  gap: '0.7rem',
  textAlign: 'center',
  padding: '2.6rem 1.25rem',
  border: '2px dashed var(--rule)',
  borderRadius: '3px',
  background: 'rgba(251,246,234,0.5)',
  color: 'var(--ink-soft)',
  '& p': { margin: 0, maxWidth: '34ch' },
})

export const emptyMark = css({
  width: '3.5rem',
  height: '3.5rem',
  color: 'var(--rule)',
  '& svg': { width: '100%', height: '100%', display: 'block' },
})

/* Staggered "dealt onto the table" page-load reveal. */
export const reveal = css({
  animation: 'ft-deal 420ms cubic-bezier(0.22, 0.9, 0.3, 1) both',
})

export const revealStagger = css({
  '& > *': { animation: 'ft-deal 420ms cubic-bezier(0.22, 0.9, 0.3, 1) both' },
  '& > *:nth-child(1)': { animationDelay: '0ms' },
  '& > *:nth-child(2)': { animationDelay: '55ms' },
  '& > *:nth-child(3)': { animationDelay: '110ms' },
  '& > *:nth-child(4)': { animationDelay: '165ms' },
  '& > *:nth-child(5)': { animationDelay: '210ms' },
  '& > *:nth-child(n+6)': { animationDelay: '250ms' },
})

export const srOnly = css({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
})

/* ---------------------------------------------------------------------------
 * Auth screens — oversized brand panel beside the form on desktop
 * ------------------------------------------------------------------------- */

export const authLayout = css({
  display: 'grid',
  gap: '1.5rem',
  alignItems: 'center',
  minHeight: 'calc(100vh - 9rem)',
  [DESKTOP_UP]: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 26rem)', gap: '3.5rem' },
})

export const authBrand = css({
  display: 'none',
  [DESKTOP_UP]: { display: 'block' },
})

export const authBrandTitle = css({
  fontFamily: FONT_DISPLAY,
  fontWeight: 900,
  fontVariationSettings: "'opsz' 144, 'SOFT' 70, 'WONK' 1",
  fontSize: 'clamp(3.5rem, 2rem + 6vw, 6rem)',
  lineHeight: 0.92,
  letterSpacing: '-0.05em',
  margin: '0 0 1rem',
})

export const authBrandLead = css({
  color: 'var(--ink-soft)',
  fontSize: '1.1rem',
  maxWidth: '34ch',
  margin: 0,
})

export const authPanel = css({ display: 'grid', gap: '1.25rem', minWidth: 0 })
