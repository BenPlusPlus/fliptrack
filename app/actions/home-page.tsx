import { css } from "remix/ui";

import { formatCents } from "../utils/cents.ts";
import { routes } from "../routes.ts";
import type { OperatorIdentity } from "../middleware/auth.ts";
import type { HomePnl, TagSlice } from "../data/queries.ts";
import type { ProfitWindowKind } from "../utils/calendar.ts";
import { AppShell } from "../ui/shell.tsx";
import { Money, SectionLabel, Stub } from "../ui/components.tsx";
import {
  FONT_MONEY,
  ctaRow,
  primaryAction,
  profitGrid,
  profitStampLink,
  reveal,
  revealStagger,
  sectionBlock,
  stampLabel,
  subheading,
} from "../ui/styles.ts";

export function HomePage(handle: {
  props: {
    identity: OperatorIdentity;
    csrf: string;
    pnl: HomePnl;
    window: ProfitWindowKind;
    today: string;
    weekStart: number;
  };
}) {
  return () => {
    let {
      identity,
      csrf,
      pnl,
      window: selected,
      today,
      weekStart,
    } = handle.props;
    let readOnly = identity.inspecting != null;

    return (
      <AppShell title="Home" identity={identity} csrf={csrf} current="home">
        <div mix={heroBand}>
          <section>
            <SectionLabel>Profit</SectionLabel>
            <div mix={[profitGrid, revealStagger]}>
              <ProfitStamp
                label="This Week"
                cents={pnl.weekProfitCents}
                proceedsCents={pnl.weekProceedsCents}
                href={homeWindowHref("week", today, weekStart)}
                selected={selected === "week"}
              />
              <ProfitStamp
                label="This Month"
                cents={pnl.monthProfitCents}
                proceedsCents={pnl.monthProceedsCents}
                href={homeWindowHref("month", today, weekStart)}
                selected={selected === "month"}
              />
              <ProfitStamp
                label="This Year"
                cents={pnl.yearProfitCents}
                proceedsCents={pnl.yearProceedsCents}
                href={homeWindowHref("year", today, weekStart)}
                selected={selected === "year"}
              />
            </div>
          </section>
          <section mix={inventoryPanel}>
            <SectionLabel>Inventory</SectionLabel>
            <div mix={reveal}>
              <a href={routes.inventory.href()} mix={profitStampLink}>
                <Stub>
                  <div mix={inventoryStubBody}>
                    <Money
                      cents={pnl.inventoryCents}
                      tone="flat"
                      size="lg"
                      block
                    />
                    <p mix={stampLabel}>Acquisition cost</p>
                  </div>
                </Stub>
              </a>
            </div>
          </section>
        </div>

        {pnl.slices.length > 0 ? (
          <section mix={sectionBlock}>
            <SectionLabel>By Tag</SectionLabel>
            <ul mix={[sliceGrid, revealStagger]}>
              {pnl.slices.map((slice) => (
                <SliceCard
                  key={slice.untagged ? "untagged" : slice.name}
                  slice={slice}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {readOnly ? null : (
          <p mix={ctaRow}>
            <a href={routes.acquisitions.new.index.href()} mix={primaryAction}>
              New Acquisition
            </a>
          </p>
        )}
        <script>
          {`(function(){var u=new URL(location.href);if(u.searchParams.get('today'))return;var d=new Date();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');u.searchParams.set('today',d.getFullYear()+'-'+m+'-'+day);var weekStart=0;try{var loc=new Intl.Locale(navigator.language);var info=loc.weekInfo||(loc.getWeekInfo&&loc.getWeekInfo());if(info&&info.firstDay!=null){weekStart=info.firstDay===7?0:info.firstDay;}}catch(e){}u.searchParams.set('weekStart',String(weekStart));location.replace(u.pathname+u.search);})();`}
        </script>
      </AppShell>
    );
  };
}

function homeWindowHref(
  kind: ProfitWindowKind,
  today: string,
  weekStart: number,
): string {
  return `${routes.home.href()}?window=${kind}&today=${today}&weekStart=${weekStart}`;
}

function ProfitStamp(handle: {
  props: {
    label: string;
    cents: number;
    proceedsCents: number;
    href: string;
    selected: boolean;
  };
}) {
  return () => {
    let { label, cents, proceedsCents, href, selected } = handle.props;
    return (
      <a
        href={href}
        mix={profitStampLink}
        aria-current={selected ? "true" : undefined}
      >
        <Stub>
          <p mix={stampLabel}>{label}</p>
          <p mix={windowAmount}>
            <Money cents={cents} size="md" />
          </p>
          <p mix={proceedsCaption}>
            on {formatCents(proceedsCents)} proceeds
          </p>
        </Stub>
      </a>
    );
  };
}

/**
 * A Tag slice reads as a receipt line item, so each statistic has to stay one
 * unbroken text run — "Profit $10", not a label element beside a value element.
 * That rules out a column table here, so the desktop layout is a wall of cards
 * instead. It also means the whole line is set in mono rather than just the
 * figure, which suits the till-roll voice.
 */
function SliceCard(handle: { props: { slice: TagSlice } }) {
  return () => {
    let { slice } = handle.props;
    let profitTone =
      slice.profitCents > 0
        ? sliceProfitGain
        : slice.profitCents < 0
          ? sliceProfitLoss
          : undefined;
    let href =
      slice.untagged || slice.tagId == null
        ? `${routes.inventory.href()}?untagged=1`
        : `${routes.inventory.href()}?tag=${slice.tagId}`;

    return (
      <li data-slice={slice.name}>
        <a
          href={href}
          mix={sliceCard}
          aria-label={`${slice.name}, Inventory`}
        >
          <p mix={sliceName}>{slice.name}</p>
          <p mix={profitTone ? [sliceProfit, profitTone] : sliceProfit}>
            Profit {formatCents(slice.profitCents)}
          </p>
          <div mix={sliceStats}>
            <p mix={sliceStat}>Sold {slice.soldCount}</p>
            <p mix={sliceStat}>Written-off {slice.writtenOffCount}</p>
            <p mix={sliceStat}>Inventory {formatCents(slice.inventoryCents)}</p>
            <p mix={sliceStat}>Unsold {slice.unsoldCount}</p>
          </div>
        </a>
      </li>
    );
  };
}

/* ------------------------------- local styles ----------------------------- */

const heroBand = css({
  display: "grid",
  gap: "1.4rem",
  alignItems: "start",
  "@media (min-width: 64rem)": {
    gridTemplateColumns: "minmax(0, 1.65fr) minmax(0, 1fr)",
    gap: "1.75rem",
  },
});

const inventoryPanel = css({ minWidth: 0 });

const inventoryStubBody = css({
  display: "grid",
  gap: "0.5rem",
  justifyItems: "start",
  padding: "0.35rem 0.25rem 0.2rem",
});

const windowAmount = css({ margin: "0.55rem 0 0" });

const proceedsCaption = css({
  margin: "0.35rem 0 0",
  fontSize: "0.68rem",
  fontWeight: 400,
  lineHeight: 1.3,
  color: "var(--muted)",
  overflowWrap: "anywhere",
});

const sliceGrid = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "0.6rem",
  "@media (min-width: 48rem)": {
    gridTemplateColumns: "repeat(auto-fill, minmax(16.5rem, 1fr))",
    gap: "0.75rem",
  },
});

const sliceCard = css({
  display: "block",
  color: "inherit",
  textDecoration: "none",
  background: "var(--card)",
  border: "1px solid var(--rule)",
  borderRadius: "2px",
  padding: "0.85rem 0.95rem 0.95rem",
  minWidth: 0,
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 6px 14px -10px rgba(34,26,18,0.55)",
  transition: "border-color 120ms ease, transform 120ms ease",
  "&:hover": { borderColor: "var(--muted)", transform: "translateY(-1px)" },
});

const sliceName = css({
  fontFamily: "'Fraunces', Georgia, serif",
  fontWeight: 800,
  fontVariationSettings: "'opsz' 60, 'SOFT' 40, 'WONK' 1",
  fontSize: "1.12rem",
  letterSpacing: "-0.02em",
  margin: "0 0 0.5rem",
  overflowWrap: "anywhere",
});

const receiptLine = {
  fontFamily: FONT_MONEY,
  fontVariantNumeric: "tabular-nums" as const,
  letterSpacing: "-0.05em",
  textTransform: "uppercase" as const,
  margin: 0,
  overflowWrap: "anywhere" as const,
};

const sliceProfit = css({
  ...receiptLine,
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "var(--ink)",
  paddingBottom: "0.5rem",
  marginBottom: "0.5rem",
  borderBottom: "1px dashed var(--rule)",
});

const sliceProfitGain = css({ color: "var(--gain)" });
const sliceProfitLoss = css({ color: "var(--loss)" });

const sliceStats = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.3rem 0.7rem",
});

const sliceStat = css({
  ...receiptLine,
  fontSize: "0.68rem",
  fontWeight: 400,
  color: "var(--muted)",
});
