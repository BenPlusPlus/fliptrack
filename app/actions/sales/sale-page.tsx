import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { Channel } from '../../data/schema.ts'
import type { KitFlip } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import {
  errorBanner,
  fieldStack,
  ghostAction,
  heading,
  inventoryList,
  inventoryItem,
  labelStyle,
  lead,
  leaveRow,
  primaryAction,
} from '../../ui/styles.ts'
import { centsToInput, formatCents } from '../../utils/cents.ts'
import type { SaleFormValues } from './form.ts'

export function SalePage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    kit: KitFlip[]
    channels: Channel[]
    action: string
    includeFlipIds?: boolean
    error?: string
    values?: SaleFormValues
  }
}) {
  return () => {
    let { identity, csrf, kit, channels, action, includeFlipIds, error, values } = handle.props

    return (
      <AppShell title="Sale" identity={identity} current="inventory">
        <h1 mix={heading}>Sale</h1>
        <p mix={lead}>One Sale for the kit. Acquisition cost is the weight.</p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <ul mix={inventoryList}>
          {kit.map((row) => (
            <li key={row.flip.id} mix={inventoryItem}>
              {row.flip.name} — Acquisition cost {formatCents(row.acquisitionCostCents)}
            </li>
          ))}
        </ul>
        <form method="post" action={action} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          {includeFlipIds
            ? kit.map((row) => (
                <input key={row.flip.id} type="hidden" name="flip" value={row.flip.id} />
              ))
            : null}
          <label mix={labelStyle}>
            Channel
            <input
              type="text"
              name="channel"
              list="channel-names"
              required
              autoComplete="off"
              defaultValue={values?.channel ?? ''}
            />
          </label>
          <datalist id="channel-names">
            {channels.map((channel) => (
              <option key={channel.id} value={channel.name}></option>
            ))}
          </datalist>
          <label mix={labelStyle}>
            Sale price
            <input
              type="text"
              inputMode="decimal"
              name="sale_price"
              defaultValue={values?.salePrice ?? '0'}
            />
          </label>
          <label mix={labelStyle}>
            Buyer-paid shipping
            <input
              type="text"
              inputMode="decimal"
              name="buyer_paid_shipping"
              defaultValue={values?.buyerPaidShipping ?? '0'}
            />
          </label>
          <label mix={labelStyle}>
            Marketplace fee
            <input
              type="text"
              inputMode="decimal"
              name="marketplace_fee"
              defaultValue={values?.marketplaceFee ?? '0'}
            />
          </label>
          <label mix={labelStyle}>
            Outbound shipping
            <input
              type="text"
              inputMode="decimal"
              name="outbound_shipping"
              defaultValue={values?.outboundShipping ?? '0'}
            />
          </label>
          <label mix={labelStyle}>
            Supplies
            <input
              type="text"
              inputMode="decimal"
              name="supplies"
              defaultValue={values?.supplies ?? '0'}
            />
          </label>
          <label mix={labelStyle}>
            Sale date
            <input
              id="sale_date"
              type="date"
              name="sale_date"
              required
              defaultValue={values?.saleDate ?? ''}
            />
          </label>
          <label mix={labelStyle}>
            Notes
            <textarea name="notes" rows={3} defaultValue={values?.notes ?? ''}></textarea>
          </label>
          <button type="submit" mix={primaryAction}>
            Save Sale
          </button>
        </form>
        <p mix={leaveRow}>
          <a href={routes.inventory.href()} mix={ghostAction}>
            Inventory
          </a>
        </p>
        <script>
          {`(function(){var i=document.getElementById('sale_date');if(!i||i.value)return;var d=new Date();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');i.value=d.getFullYear()+'-'+m+'-'+day;})();`}
        </script>
      </AppShell>
    )
  }
}

export function saleValuesFromRecord(input: {
  channel: string
  salePrice: number
  buyerPaidShipping: number
  marketplaceFee: number
  outboundShipping: number
  supplies: number
  saleDate: string
  notes?: string | null
}): SaleFormValues {
  return {
    channel: input.channel,
    salePrice: centsToInput(input.salePrice),
    buyerPaidShipping: centsToInput(input.buyerPaidShipping),
    marketplaceFee: centsToInput(input.marketplaceFee),
    outboundShipping: centsToInput(input.outboundShipping),
    supplies: centsToInput(input.supplies),
    saleDate: String(input.saleDate),
    notes: input.notes ?? '',
  }
}
