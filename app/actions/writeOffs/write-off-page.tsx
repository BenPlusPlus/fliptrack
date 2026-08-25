import type { OperatorIdentity } from '../../middleware/auth.ts'
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
import type { WriteOffFormValues } from './form.ts'

export function WriteOffPage(handle: {
  props: {
    identity: OperatorIdentity
    csrf: string
    kit: KitFlip[]
    inventory?: KitFlip[]
    selectedFlipIds?: string[]
    action: string
    includeFlipIds?: boolean
    error?: string
    values?: WriteOffFormValues
  }
}) {
  return () => {
    let { identity, csrf, kit, inventory, selectedFlipIds, action, includeFlipIds, error, values } =
      handle.props
    let checked = new Set(selectedFlipIds ?? kit.map((row) => row.flip.id))
    let flipRows = includeFlipIds ? (inventory ?? kit) : kit

    return (
      <AppShell title="Write-off" identity={identity} current="inventory">
        <h1 mix={heading}>Write-off</h1>
        <p mix={lead}>One Write-off for the kit. Acquisition cost is the weight.</p>
        {error ? <p mix={errorBanner}>{error}</p> : null}
        <form method="post" action={action} mix={fieldStack}>
          <input type="hidden" name="_csrf" value={csrf} />
          <ul mix={inventoryList}>
            {flipRows.map((row) => (
              <li key={row.flip.id} mix={inventoryItem}>
                {includeFlipIds ? (
                  <label>
                    <input
                      type="checkbox"
                      name="flip"
                      value={row.flip.id}
                      checked={checked.has(row.flip.id) ? true : undefined}
                    />{' '}
                    {row.flip.name} — Acquisition cost {formatCents(row.acquisitionCostCents)}
                  </label>
                ) : (
                  <>
                    {row.flip.name} — Acquisition cost {formatCents(row.acquisitionCostCents)}
                  </>
                )}
              </li>
            ))}
          </ul>
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
            Write-off date
            <input
              id="write_off_date"
              type="date"
              name="write_off_date"
              required
              defaultValue={values?.writeOffDate ?? ''}
            />
          </label>
          <label mix={labelStyle}>
            Notes
            <textarea name="notes" rows={3} defaultValue={values?.notes ?? ''}></textarea>
          </label>
          <button type="submit" mix={primaryAction}>
            Save Write-off
          </button>
        </form>
        <p mix={leaveRow}>
          <a href={routes.inventory.href()} mix={ghostAction}>
            Inventory
          </a>
        </p>
        <script>
          {`(function(){var i=document.getElementById('write_off_date');if(!i||i.value)return;var d=new Date();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');i.value=d.getFullYear()+'-'+m+'-'+day;})();`}
        </script>
      </AppShell>
    )
  }
}

export function writeOffValuesFromRecord(input: {
  outboundShipping: number
  supplies: number
  writeOffDate: string
  notes?: string | null
}): WriteOffFormValues {
  return {
    outboundShipping: centsToInput(input.outboundShipping),
    supplies: centsToInput(input.supplies),
    writeOffDate: String(input.writeOffDate),
    notes: input.notes ?? '',
  }
}
