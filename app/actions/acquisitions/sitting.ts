export const SITTING_KEY = 'sitting'

export type Sitting = {
  acquisitionId: string
  taxPaid: number
  inboundShipping: number
  flipIds: string[]
}

export function sittingFor(value: unknown, acquisitionId: string): Sitting | null {
  if (
    value &&
    typeof value === 'object' &&
    'acquisitionId' in value &&
    (value as Sitting).acquisitionId === acquisitionId
  ) {
    let sitting = value as Sitting
    return {
      acquisitionId: sitting.acquisitionId,
      taxPaid: sitting.taxPaid,
      inboundShipping: sitting.inboundShipping,
      flipIds: Array.isArray(sitting.flipIds) ? sitting.flipIds : [],
    }
  }
  return null
}
