// Domain types for Tapwijs. These mirror the data model in the build brief and
// are shared between the Electron main process (SQLite persistence) and the
// React renderer. They are framework-agnostic so the domain logic can be unit
// tested in plain Node.

export type Schenkwijze = 'per_stuk' | 'uit_fles' | 'uit_vat'

export type MargeConventie = 'op_de_omzet' | 'opslag_op_kostprijs'

export type TypeFeest =
  | 'huwelijk'
  | 'bedrijfsfeest'
  | 'communie'
  | 'verjaardag'
  | 'scoutsfeest'
  | 'andere'

/** A drink product. Prices live in the unit the owner actually buys in. */
export interface Drank {
  id: number
  naam: string
  categorie: string
  /** Sales price for one consumption (one glass), in euro. */
  menuprijs: number
  /** Default serving size for one consumption, in centiliter. */
  glaasgrootte_cl: number
  schenkwijze: Schenkwijze
  /** Cocktails/mocktails are counted by a staff tally, not by empties. */
  is_cocktail: boolean

  // schenkwijze === 'per_stuk'
  /** Estimated purchase price for one consumption, in euro. */
  inkoopprijs_per_consumptie?: number | null

  // schenkwijze === 'uit_fles'
  /** Editable bottle volume in centiliter (e.g. 150 for a 1.5L bottle). */
  fles_inhoud_cl?: number | null
  /** Estimated purchase price for one bottle, in euro. */
  inkoopprijs_per_fles?: number | null

  // schenkwijze === 'uit_vat'
  /** Links to the Vat (keg) this draft beer pours from. */
  vat_id?: number | null

  /** Purchase VAT rate in percent (usually 21, sometimes 6). Prices are incl. BTW. */
  btw_inkoop?: number | null
  /** Sales VAT rate in percent (drinks: usually 21). Prices are incl. BTW. */
  btw_verkoop?: number | null
}

/** A barrel / keg. Store only what is measured; derive the rest. */
export interface Vat {
  id: number
  naam: string
  /** The Drank this keg pours (the draft beer). */
  gekoppelde_drank_id?: number | null
  /** Tare (empty) weight in kilogram. */
  leeg_gewicht_kg: number
  inhoud_liter: number
  /** Density, default 1.0 for beer. */
  dichtheid: number
  inkoopprijs_per_vat: number
  /** Foam and line loss, default 5 (percent). */
  verlies_percentage: number
}

export interface Forfait {
  id: number
  naam: string
  /** Ids of the drinks this tier allows. */
  toegestane_drank_ids: number[]
  /** Optional, used to suggest a price. */
  verwachte_consumpties_per_persoon?: number | null
  /** Optional, if he just wants to type an amount. */
  handmatige_prijs?: number | null
  /** Optional per-drink glaasgrootte override: drankId -> cl. */
  glaasgrootte_overrides?: Record<number, number>
}

export interface Toewijzing {
  id: number
  forfait_id: number | null
  /** Snapshot of the forfait name, kept even if the forfait is later renamed. */
  forfait_naam: string
  aantal_personen: number
  forfaitprijs_per_persoon: number
  /** Discount the customer gets on this forfait's price, in percent (0..100). */
  korting_pct: number
}

export interface Feest {
  id: number
  naam: string
  type_feest: TypeFeest
  datum: string // ISO date
  publiek?: string | null
  doelmarge: number // 0..1, override of the default = a discount
  korting_reden?: string | null
  /** Snapshot of every drink's prices on the party date. */
  prijs_momentopname: PrijsMomentopname
}

export interface PrijsSnapshotRegel {
  drank_id: number
  inkoopprijs: number // derived cost per consumption at snapshot time
  menuprijs: number
}

export type PrijsMomentopname = Record<number, PrijsSnapshotRegel>

export interface Instellingen {
  standaard_doelmarge: number // 0..1
  marge_conventie: MargeConventie
  /** Sales VAT rate in percent (drinks: 21). Prices are incl. BTW. */
  btw_verkoop: number
  bedrijfsnaam: string
  bedrijfsgegevens: string
  logo_pad?: string | null
  backup_locatie?: string | null
  categorieen: string[]
  standaard_glaasgrootte_per_categorie: Record<string, number>
  standaard_inkoopmarge_per_categorie: Record<string, number>
  anthropic_api_key?: string | null
}
