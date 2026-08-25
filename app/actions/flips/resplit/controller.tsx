import { getCsrfToken } from 'remix/middleware/csrf'
import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { findFlipInBooks, flipHasStandingSale, resplitFlip } from '../../../data/queries.ts'
import { databaseContext } from '../../../middleware/database.ts'
import { operatorFrom, requireOperator } from '../../../middleware/auth.ts'
import type { OperatorIdentity } from '../../../middleware/auth.ts'
import type { Flip } from '../../../data/schema.ts'
import { routes } from '../../../routes.ts'
import { AppShell } from '../../../ui/shell.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  heading,
  labelStyle,
  lead,
  leaveRow,
  mutedNote,
  primaryAction,
} from '../../../ui/styles.ts'
import { mustGet } from '../../../utils/context.ts'
import { allocateShares, formatCents, parseCents } from '../../../utils/cents.ts'

export default createController(routes.flips.resplit, {
  middleware: [requireOperator()],
  actions: {
    async index(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flip = await findFlipInBooks(db, {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!flip || flip.retired || (await flipHasStandingSale(db, flip.id))) {
        return new Response('Not Found', { status: 404 })
      }

      return context.render(
        <ResplitPage identity={identity} csrf={getCsrfToken(context)} parent={flip} />,
      )
    },

    async action(context) {
      let identity = operatorFrom(context)
      let db = mustGet(context.get(databaseContext), 'database')
      let flip = await findFlipInBooks(db, {
        flipId: context.params.flipId,
        booksId: identity.booksId,
      })
      if (!flip || flip.retired) {
        return new Response('Not Found', { status: 404 })
      }

      let formData = context.get(FormData)
      let parsed = parseChildren(formData)
      if (!parsed.ok) {
        return context.render(
          <ResplitPage
            identity={identity}
            csrf={getCsrfToken(context)}
            parent={flip}
            error={parsed.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      let result = await resplitFlip(db, {
        parentId: flip.id,
        booksId: identity.booksId,
        children: parsed.children,
      })
      if (!result.ok) {
        return context.render(
          <ResplitPage
            identity={identity}
            csrf={getCsrfToken(context)}
            parent={flip}
            error={result.error}
            values={parsed.values}
          />,
          { status: 400 },
        )
      }

      return redirect(routes.flips.show.href({ flipId: result.children[0]!.id }), 303)
    },
  },
})

function parseChildren(formData: FormData) {
  let values: { name: string; itemCost: string }[] = []
  let names = formData.getAll('child_name').map(String)
  let costs = formData.getAll('child_item_cost').map(String)
  if (names.length > 0) {
    for (let index = 0; index < Math.max(names.length, costs.length); index += 1) {
      values.push({ name: names[index] ?? '', itemCost: costs[index] ?? '' })
    }
  } else {
    for (let index = 0; index < 20; index += 1) {
      let name = formData.get(`child_name.${index}`)
      let itemCost = formData.get(`child_item_cost.${index}`)
      if (name == null && itemCost == null) {
        continue
      }
      values.push({ name: String(name ?? ''), itemCost: String(itemCost ?? '') })
    }
  }

  let children: { name: string; itemCost: number }[] = []
  for (let row of values) {
    let name = row.name.trim()
    let costRaw = row.itemCost.trim()
    if (name === '' && costRaw === '') {
      continue
    }
    if (name === '') {
      return { ok: false as const, error: 'Flip name is required.', values }
    }
    let cost = parseCents(costRaw, { required: true })
    if (!cost.ok) {
      return { ok: false as const, error: cost.message, values }
    }
    children.push({ name, itemCost: cost.cents })
  }

  if (children.length < 2) {
    return { ok: false as const, error: 'Re-split needs at least two children.', values }
  }

  return { ok: true as const, children, values }
}

function ResplitPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    parent: Flip
    error?: string
    values?: { name: string; itemCost: string }[]
  }
}) {
  return () => {
    let { identity, csrf, parent, error, values } = handle.props
    let rows =
      values && values.length > 0
        ? values.length >= 2
          ? values
          : [...values, { name: '', itemCost: '' }]
        : [
            { name: '', itemCost: '' },
            { name: '', itemCost: '' },
            { name: '', itemCost: '' },
            { name: '', itemCost: '' },
          ]
    let preview = childPreviews(parent, rows)

    return (
      <AppShell title="Re-split" identity={identity} current="inventory">
        <h1 mix={heading}>Re-split {parent.name}</h1>
        <p mix={lead}>
          Child Item costs must sum to {formatCents(parent.item_cost)}. Resulting Acquisition costs
          are shown before save.
        </p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form
          method="post"
          action={routes.flips.resplit.action.href({ flipId: parent.id })}
          mix={fieldStack}
          id="resplit-form"
          data-item={String(parent.item_cost)}
          data-tax={String(parent.tax_paid)}
          data-inbound={String(parent.inbound_shipping)}
        >
          <input type="hidden" name="_csrf" value={csrf} />
          {rows.map((row, index) => (
            <fieldset key={index} mix={fieldStack}>
              <legend mix={labelStyle}>Child {index + 1}</legend>
              <label mix={labelStyle}>
                Flip name
                <input
                  type="text"
                  name={`child_name.${index}`}
                  defaultValue={row.name}
                  autoComplete="off"
                />
              </label>
              <label mix={labelStyle}>
                Item cost
                <input
                  type="text"
                  inputMode="decimal"
                  name={`child_item_cost.${index}`}
                  defaultValue={row.itemCost}
                />
              </label>
              <p mix={mutedNote} data-preview>
                Acquisition cost {preview[index] ?? '—'}
              </p>
            </fieldset>
          ))}
          <button type="submit" mix={primaryAction}>
            Save Re-split
          </button>
        </form>
        <p mix={leaveRow}>
          <a href={routes.flips.show.href({ flipId: parent.id })} mix={ghostAction}>
            Back to Flip
          </a>
        </p>
        <script>
          {`(function(){var form=document.getElementById('resplit-form');if(!form)return;function cents(raw){raw=String(raw||'').trim();if(!raw)return null;if(raw.charAt(0)==='-')return null;if(!/^\\d+(\\.\\d{1,2})?$/.test(raw))return null;var p=raw.split('.');return Number(p[0])*100+Number(((p[1]||'')+'00').slice(0,2));}function fmt(c){if(c===0)return'$0';var d=Math.floor(c/100),r=c%100;return'$'+d+'.'+String(r).padStart(2,'0');}function shares(total,weights){if(!weights.length)return[];var sum=weights.reduce(function(a,b){return a+b;},0);var out;if(sum===0){var base=Math.floor(total/weights.length);out=weights.map(function(){return base;});out[out.length-1]+=total-base*weights.length;return out;}out=weights.map(function(w){return Math.floor(total*w/sum);});out[out.length-1]+=total-out.reduce(function(a,b){return a+b;},0);return out;}function paint(){var item=Number(form.getAttribute('data-item')||'0');var tax=Number(form.getAttribute('data-tax')||'0');var inbound=Number(form.getAttribute('data-inbound')||'0');var names=form.querySelectorAll('input[name^="child_name."]');var costs=form.querySelectorAll('input[name^="child_item_cost."]');var previews=form.querySelectorAll('[data-preview]');var parsed=[];for(var i=0;i<costs.length;i++){parsed.push(cents(costs[i].value));}var filled=parsed.filter(function(v){return v!=null;});var taxShares=shares(tax,parsed.map(function(v){return v||0;}));var shipShares=shares(inbound,parsed.map(function(v){return v||0;}));for(var j=0;j<previews.length;j++){var c=parsed[j];if(c==null){previews[j].textContent='Acquisition cost —';continue;}previews[j].textContent='Acquisition cost '+fmt(c+taxShares[j]+shipShares[j]);}void names;void filled;void item;}form.addEventListener('input',paint);paint();})();`}
        </script>
      </AppShell>
    )
  }
}

function childPreviews(parent: Flip, rows: { name: string; itemCost: string }[]): string[] {
  let parsed = rows.map((row) => {
    if (row.name.trim() === '' && row.itemCost.trim() === '') {
      return null
    }
    let cost = parseCents(row.itemCost, { required: true })
    return cost.ok ? cost.cents : null
  })
  let filled = parsed.flatMap((cents, index) => (cents == null ? [] : [{ index, cents }]))
  let taxShares = allocateShares(
    parent.tax_paid,
    filled.map((row) => row.cents),
  )
  let shippingShares = allocateShares(
    parent.inbound_shipping,
    filled.map((row) => row.cents),
  )
  let labels = rows.map(() => '—')
  filled.forEach((row, shareIndex) => {
    labels[row.index] = formatCents(
      row.cents + taxShares[shareIndex]! + shippingShares[shareIndex]!,
    )
  })
  return labels
}
