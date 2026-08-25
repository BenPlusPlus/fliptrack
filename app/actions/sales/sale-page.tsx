import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { Channel } from '../../data/schema.ts'
import type { KitFlip } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import { ActionStack, MoneyField, PageHeader, Receipt, SectionLabel, Stamp } from '../../ui/components.tsx'
import {
  checkRow,
  dashRule,
  errorBanner,
  fieldStack,
  ghostAction,
  labelStyle,
  ledgerList,
  ledgerRow,
  primaryAction,
  rowMain,
  rowMeta,
  splitLayout,
  stackGap,
} from '../../ui/styles.ts'
import { centsToInput, formatCents } from '../../utils/cents.ts'
import type { SaleFormValues } from './form.ts'

export function SalePage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    kit: KitFlip[]
    inventory?: KitFlip[]
    selectedFlipIds?: string[]
    channels: Channel[]
    action: string
    includeFlipIds?: boolean
    error?: string
    values?: SaleFormValues
  }
}) {
  return () => {
    let { identity, csrf, kit, inventory, selectedFlipIds, channels, action, includeFlipIds, error, values } =
      handle.props
    let checked = new Set(selectedFlipIds ?? kit.map((row) => row.flip.id))
    let flipRows = includeFlipIds ? (inventory ?? kit) : kit
    let readOnly = identity.inspecting != null
    let standing = !includeFlipIds

    return (
      <AppShell title="Sale" identity={identity} csrf={csrf} current="inventory">
        <PageHeader
          title="Sale"
          lead="One Sale for the kit. Acquisition cost is the weight."
          aside={standing ? <Stamp tone="gain">Sold</Stamp> : undefined}
        />
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={action}>
          <input type="hidden" name="_csrf" value={csrf} />
          <div mix={splitLayout}>
            <div mix={stackGap}>
              <SectionLabel>Kit</SectionLabel>
              <ul mix={ledgerList}>
                {flipRows.map((row) => (
                  <li key={row.flip.id} mix={ledgerRow}>
                    {includeFlipIds ? (
                      <label mix={checkRow}>
                        <input
                          type="checkbox"
                          name="flip"
                          value={row.flip.id}
                          checked={checked.has(row.flip.id) ? true : undefined}
                        />
                        {row.flip.name}
                        {' — Acquisition cost '}
                        {formatCents(row.acquisitionCostCents)}
                      </label>
                    ) : (
                      <div mix={rowMain}>
                        <a href={routes.flips.show.href({ flipId: row.flip.id })}>{row.flip.name}</a>
                        <span mix={rowMeta}>
                          {'Acquisition cost '}
                          {formatCents(row.acquisitionCostCents)}
                          {readOnly ? null : (
                            <>
                              {' · '}
                              <a href={routes.flips.undo.index.href({ flipId: row.flip.id })}>Undo</a>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div mix={fieldStack}>
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
              </div>
            </div>
            <Receipt>
              <SectionLabel>Till slip</SectionLabel>
              <div mix={fieldStack}>
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
                <MoneyField label="Sale price" name="sale_price" defaultValue={values?.salePrice ?? '0'} />
                <MoneyField
                  label="Buyer-paid shipping"
                  name="buyer_paid_shipping"
                  defaultValue={values?.buyerPaidShipping ?? '0'}
                />
                <hr mix={dashRule} />
                <MoneyField
                  label="Marketplace fee"
                  name="marketplace_fee"
                  defaultValue={values?.marketplaceFee ?? '0'}
                />
                <MoneyField
                  label="Outbound shipping"
                  name="outbound_shipping"
                  defaultValue={values?.outboundShipping ?? '0'}
                />
                <MoneyField label="Supplies" name="supplies" defaultValue={values?.supplies ?? '0'} />
              </div>
            </Receipt>
          </div>
          <ActionStack>
            {readOnly ? null : (
              <button type="submit" mix={primaryAction}>
                Save Sale
              </button>
            )}
            <a href={routes.inventory.href()} mix={ghostAction}>
              Inventory
            </a>
          </ActionStack>
        </form>
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
