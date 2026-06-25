// Renderer-side helpers that reuse the shared domain logic for live display.

import { kostprijsPerConsumptie, type Drank, type Vat } from '@shared/domain'

export type VatMap = Map<number, Vat>

export function vatMap(vaten: Vat[]): VatMap {
  return new Map(vaten.map((v) => [v.id, v]))
}

export function kostVoorDrank(d: Drank, vaten: VatMap): number {
  const vat = d.vat_id ? vaten.get(d.vat_id) ?? null : null
  return kostprijsPerConsumptie(d, vat)
}

export function menumarge(d: Drank, vaten: VatMap): number {
  const kost = kostVoorDrank(d, vaten)
  if (d.menuprijs <= 0) return 0
  return (d.menuprijs - kost) / d.menuprijs
}

/** The unit the owner actually buys this drink in. */
export function inkoopEenheid(d: Drank): { label: string; korte: string } {
  switch (d.schenkwijze) {
    case 'uit_fles':
      return { label: 'per fles', korte: '/fles' }
    case 'uit_vat':
      return { label: 'per vat', korte: '/vat' }
    default:
      return { label: 'per consumptie', korte: '/cons.' }
  }
}

export const SCHENKWIJZE_LABEL: Record<string, string> = {
  per_stuk: 'per stuk',
  uit_fles: 'uit fles',
  uit_vat: 'uit vat'
}

export const TYPE_FEEST_LABEL: Record<string, string> = {
  huwelijk: 'Huwelijk',
  bedrijfsfeest: 'Bedrijfsfeest',
  communie: 'Communie',
  verjaardag: 'Verjaardag',
  scoutsfeest: 'Scoutsfeest',
  andere: 'Andere'
}

export const TYPE_FEEST_OPTIES = Object.keys(TYPE_FEEST_LABEL)

/** Reception durations offered, in hours. */
export const DUREN = [1, 1.5, 2]

export function duurLabel(d: number): string {
  return `${d === 1.5 ? '1,5' : String(d)} u`
}

export function formatDatum(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}
