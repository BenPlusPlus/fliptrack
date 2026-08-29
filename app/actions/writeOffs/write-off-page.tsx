import type { OperatorIdentity } from '../../middleware/auth.ts'
import type { KitFlip } from '../../data/queries.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/shell.tsx'
import { ActionStack, MoneyField, PageHeader, Receipt, SectionLabel, Stamp } from '../../ui/components.tsx'
import { DateInput } from '../../ui/public/date-input.tsx'
import {
  checkRow,
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
    let readOnly = identity.inspecting != null
    let standing = !includeFlipIds

    return (
      <AppShell title="Write-off" identity={identity} csrf={csrf} current="inventory">
        <PageHeader
          title="Write-off"
          lead="One Write-off for the kit. Acquisition cost is the weight."
          aside={standing ? <Stamp tone="loss">Written-off</Stamp> : undefined}
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
                  Write-off date
                  <DateInput
                    id="write_off_date"
                    name="write_off_date"
                    required
                    defaultToToday
                    defaultValue={values?.writeOffDate ?? ''}
                  />
                </label>
                <label mix={labelStyle}>
                  Notes
                  <textarea name="notes" rows={3} defaultValue={values?.notes ?? ''}></textarea>
                </label>
              </div>
            </div>
            <Receipt sunk>
              <SectionLabel>Ledger</SectionLabel>
              <div mix={fieldStack}>
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
                Save Write-off
              </button>
            )}
            <a href={routes.inventory.href()} mix={ghostAction}>
              Inventory
            </a>
          </ActionStack>
        </form>
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
