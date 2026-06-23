// Demo seed. Fills the app with a realistic Brussels-bar drink list, the four
// forfait tiers and two example parties, so the owner sees something real on
// day one. Purchase prices are clearly-labelled estimates ("geschatte
// inkoopprijs") he replaces with his own figures. Wipeable from Instellingen.

import type { Schenkwijze } from '@shared/domain'
import {
  upsertVat,
  upsertDrank,
  upsertForfait,
  upsertFeest,
  saveRegistraties,
  saveInstellingen,
  getInstellingen,
  markDemoGeladen,
  type Registratie
} from '../db/repo'
import { buildPrijsMomentopname } from './snapshot'

interface SeedDrank {
  naam: string
  categorie: string
  schenkwijze: Schenkwijze
  menuprijs: number
  glaasgrootte_cl: number
  is_cocktail?: boolean
  inkoopprijs_per_consumptie?: number
  fles_inhoud_cl?: number
  inkoopprijs_per_fles?: number
  vat?: string
}

const VATEN: { naam: string; inkoopprijs_per_vat: number }[] = [
  { naam: 'Stella Artois vat', inkoopprijs_per_vat: 65 },
  { naam: 'Hoegaarden vat', inkoopprijs_per_vat: 75 },
  { naam: 'Kwak Amber vat', inkoopprijs_per_vat: 85 }
]

const DRANKEN: SeedDrank[] = [
  // Soft
  { naam: 'Coca Cola', categorie: 'Soft', schenkwijze: 'uit_fles', menuprijs: 3.5, glaasgrootte_cl: 25, fles_inhoud_cl: 150, inkoopprijs_per_fles: 1.3 },
  { naam: 'Coca Cola Zero', categorie: 'Soft', schenkwijze: 'uit_fles', menuprijs: 3.5, glaasgrootte_cl: 25, fles_inhoud_cl: 150, inkoopprijs_per_fles: 1.3 },
  { naam: 'Fanta Orange', categorie: 'Soft', schenkwijze: 'uit_fles', menuprijs: 3.5, glaasgrootte_cl: 25, fles_inhoud_cl: 150, inkoopprijs_per_fles: 1.3 },
  { naam: 'Sprite', categorie: 'Soft', schenkwijze: 'uit_fles', menuprijs: 3.5, glaasgrootte_cl: 25, fles_inhoud_cl: 150, inkoopprijs_per_fles: 1.3 },
  { naam: 'Lipton Ice Tea', categorie: 'Soft', schenkwijze: 'uit_fles', menuprijs: 3.5, glaasgrootte_cl: 25, fles_inhoud_cl: 150, inkoopprijs_per_fles: 1.6 },
  { naam: 'Chaudfontaine plat', categorie: 'Soft', schenkwijze: 'uit_fles', menuprijs: 3.0, glaasgrootte_cl: 25, fles_inhoud_cl: 150, inkoopprijs_per_fles: 0.6 },
  { naam: 'Chaudfontaine bruis', categorie: 'Soft', schenkwijze: 'uit_fles', menuprijs: 3.0, glaasgrootte_cl: 25, fles_inhoud_cl: 150, inkoopprijs_per_fles: 0.6 },
  { naam: 'Fever Tree Tonic', categorie: 'Soft', schenkwijze: 'per_stuk', menuprijs: 4.0, glaasgrootte_cl: 20, inkoopprijs_per_consumptie: 0.7 },
  { naam: 'Red Bull', categorie: 'Soft', schenkwijze: 'per_stuk', menuprijs: 4.5, glaasgrootte_cl: 25, inkoopprijs_per_consumptie: 1.1 },
  // Warm
  { naam: 'Espresso', categorie: 'Warm', schenkwijze: 'per_stuk', menuprijs: 3.0, glaasgrootte_cl: 6, inkoopprijs_per_consumptie: 0.35 },
  { naam: 'Koffie', categorie: 'Warm', schenkwijze: 'per_stuk', menuprijs: 3.0, glaasgrootte_cl: 12, inkoopprijs_per_consumptie: 0.35 },
  { naam: 'Thee', categorie: 'Warm', schenkwijze: 'per_stuk', menuprijs: 3.0, glaasgrootte_cl: 20, inkoopprijs_per_consumptie: 0.2 },
  { naam: 'Warme chocolade', categorie: 'Warm', schenkwijze: 'per_stuk', menuprijs: 5.0, glaasgrootte_cl: 20, inkoopprijs_per_consumptie: 0.6 },
  { naam: 'Irish Coffee', categorie: 'Warm', schenkwijze: 'per_stuk', menuprijs: 9.5, glaasgrootte_cl: 20, inkoopprijs_per_consumptie: 1.6 },
  // Bier
  { naam: 'Stella Artois 25cl', categorie: 'Bier', schenkwijze: 'uit_vat', menuprijs: 3.5, glaasgrootte_cl: 25, vat: 'Stella Artois vat' },
  { naam: 'Stella Artois 50cl', categorie: 'Bier', schenkwijze: 'uit_vat', menuprijs: 6.5, glaasgrootte_cl: 50, vat: 'Stella Artois vat' },
  { naam: 'Hoegaarden 25cl', categorie: 'Bier', schenkwijze: 'uit_vat', menuprijs: 4.0, glaasgrootte_cl: 25, vat: 'Hoegaarden vat' },
  { naam: 'Kwak Amber 25cl', categorie: 'Bier', schenkwijze: 'uit_vat', menuprijs: 4.0, glaasgrootte_cl: 25, vat: 'Kwak Amber vat' },
  { naam: 'La Chouffe', categorie: 'Bier', schenkwijze: 'per_stuk', menuprijs: 5.5, glaasgrootte_cl: 33, inkoopprijs_per_consumptie: 1.2 },
  { naam: 'Duvel', categorie: 'Bier', schenkwijze: 'per_stuk', menuprijs: 6.0, glaasgrootte_cl: 33, inkoopprijs_per_consumptie: 1.1 },
  { naam: 'Westmalle Tripel', categorie: 'Bier', schenkwijze: 'per_stuk', menuprijs: 5.9, glaasgrootte_cl: 33, inkoopprijs_per_consumptie: 1.3 },
  { naam: 'Chimay Blue', categorie: 'Bier', schenkwijze: 'per_stuk', menuprijs: 5.5, glaasgrootte_cl: 33, inkoopprijs_per_consumptie: 1.3 },
  // Alcoholvrij bier
  { naam: 'Tripel Karmeliet 0', categorie: 'Alcoholvrij bier', schenkwijze: 'per_stuk', menuprijs: 4.5, glaasgrootte_cl: 33, inkoopprijs_per_consumptie: 1.0 },
  { naam: 'Trottinette 0 IPA', categorie: 'Alcoholvrij bier', schenkwijze: 'per_stuk', menuprijs: 4.5, glaasgrootte_cl: 33, inkoopprijs_per_consumptie: 1.0 },
  // Wijn
  { naam: 'Wit', categorie: 'Wijn', schenkwijze: 'uit_fles', menuprijs: 5.5, glaasgrootte_cl: 12.5, fles_inhoud_cl: 75, inkoopprijs_per_fles: 5.0 },
  { naam: 'Rosé', categorie: 'Wijn', schenkwijze: 'uit_fles', menuprijs: 5.5, glaasgrootte_cl: 12.5, fles_inhoud_cl: 75, inkoopprijs_per_fles: 5.0 },
  { naam: 'Rood', categorie: 'Wijn', schenkwijze: 'uit_fles', menuprijs: 5.5, glaasgrootte_cl: 12.5, fles_inhoud_cl: 75, inkoopprijs_per_fles: 5.0 },
  // Schuimwijn en champagne
  { naam: 'Cava', categorie: 'Schuimwijn en champagne', schenkwijze: 'uit_fles', menuprijs: 6.0, glaasgrootte_cl: 10, fles_inhoud_cl: 75, inkoopprijs_per_fles: 6.0 },
  { naam: 'Champagne per glas', categorie: 'Schuimwijn en champagne', schenkwijze: 'uit_fles', menuprijs: 12.0, glaasgrootte_cl: 10, fles_inhoud_cl: 75, inkoopprijs_per_fles: 25.0 },
  // Aperitieven
  { naam: 'Aperol Spritz', categorie: 'Aperitieven', schenkwijze: 'per_stuk', menuprijs: 9.5, glaasgrootte_cl: 25, inkoopprijs_per_consumptie: 1.8 },
  { naam: 'Martini White / Red', categorie: 'Aperitieven', schenkwijze: 'per_stuk', menuprijs: 6.5, glaasgrootte_cl: 10, inkoopprijs_per_consumptie: 0.7 },
  { naam: 'Campari Orange', categorie: 'Aperitieven', schenkwijze: 'per_stuk', menuprijs: 8.0, glaasgrootte_cl: 20, inkoopprijs_per_consumptie: 1.1 },
  { naam: 'Ricard', categorie: 'Aperitieven', schenkwijze: 'per_stuk', menuprijs: 4.5, glaasgrootte_cl: 4, inkoopprijs_per_consumptie: 0.5 },
  // Cocktails
  { naam: 'Mojito', categorie: 'Cocktails', schenkwijze: 'per_stuk', menuprijs: 12.0, glaasgrootte_cl: 25, is_cocktail: true, inkoopprijs_per_consumptie: 2.2 },
  { naam: 'Margarita', categorie: 'Cocktails', schenkwijze: 'per_stuk', menuprijs: 12.5, glaasgrootte_cl: 20, is_cocktail: true, inkoopprijs_per_consumptie: 2.5 },
  { naam: 'Espresso Martini', categorie: 'Cocktails', schenkwijze: 'per_stuk', menuprijs: 12.5, glaasgrootte_cl: 15, is_cocktail: true, inkoopprijs_per_consumptie: 2.6 },
  { naam: 'Negroni', categorie: 'Cocktails', schenkwijze: 'per_stuk', menuprijs: 13.0, glaasgrootte_cl: 15, is_cocktail: true, inkoopprijs_per_consumptie: 2.8 },
  // Mocktails
  { naam: 'Virgin Mojito', categorie: 'Mocktails', schenkwijze: 'per_stuk', menuprijs: 7.5, glaasgrootte_cl: 25, is_cocktail: true, inkoopprijs_per_consumptie: 1.2 }
]

const CATEGORIEEN = [
  'Soft',
  'Warm',
  'Bier',
  'Alcoholvrij bier',
  'Wijn',
  'Schuimwijn en champagne',
  'Aperitieven',
  'Cocktails',
  'Mocktails'
]

export function seedDemoData(): void {
  // Categories + sensible per-category defaults first.
  const inst = getInstellingen()
  saveInstellingen({
    ...inst,
    bedrijfsnaam: inst.bedrijfsnaam || 'Feestzaal',
    categorieen: CATEGORIEEN,
    standaard_glaasgrootte_per_categorie: {
      Soft: 25,
      Warm: 15,
      Bier: 25,
      'Alcoholvrij bier': 33,
      Wijn: 12.5,
      'Schuimwijn en champagne': 10,
      Aperitieven: 20,
      Cocktails: 20,
      Mocktails: 25
    },
    standaard_inkoopmarge_per_categorie: {}
  })

  // Vaten (30L, 10kg tare, density 1.0, 5% loss — the template).
  const vatIds = new Map<string, number>()
  for (const v of VATEN) {
    const saved = upsertVat({
      naam: v.naam,
      gekoppelde_drank_id: null,
      leeg_gewicht_kg: 10,
      inhoud_liter: 30,
      dichtheid: 1.0,
      inkoopprijs_per_vat: v.inkoopprijs_per_vat,
      verlies_percentage: 5
    })
    vatIds.set(v.naam, saved.id)
  }

  // Dranken.
  const drankIds = new Map<string, number>()
  for (const d of DRANKEN) {
    const saved = upsertDrank({
      naam: d.naam,
      categorie: d.categorie,
      menuprijs: d.menuprijs,
      glaasgrootte_cl: d.glaasgrootte_cl,
      schenkwijze: d.schenkwijze,
      is_cocktail: !!d.is_cocktail,
      inkoopprijs_per_consumptie: d.inkoopprijs_per_consumptie ?? null,
      fles_inhoud_cl: d.fles_inhoud_cl ?? null,
      inkoopprijs_per_fles: d.inkoopprijs_per_fles ?? null,
      vat_id: d.vat ? vatIds.get(d.vat) ?? null : null
    })
    drankIds.set(d.naam, saved.id)
  }

  const ids = (namen: string[]): number[] =>
    namen.map((n) => drankIds.get(n)).filter((x): x is number => x != null)

  const softNamen = DRANKEN.filter((d) => d.categorie === 'Soft').map((d) => d.naam)
  const wijnNamen = DRANKEN.filter((d) => d.categorie === 'Wijn').map((d) => d.naam)
  const alcoholvrij = ['Tripel Karmeliet 0', 'Trottinette 0 IPA']
  const aperitieven = DRANKEN.filter((d) => d.categorie === 'Aperitieven').map((d) => d.naam)
  const cocktails = DRANKEN.filter((d) => d.categorie === 'Cocktails').map((d) => d.naam)

  const fris = [...softNamen, ...alcoholvrij, 'Virgin Mojito']
  const basis = [...fris, 'Stella Artois 25cl', 'Hoegaarden 25cl', ...wijnNamen]
  const streek = [...basis, 'La Chouffe', 'Duvel', 'Westmalle Tripel', 'Chimay Blue', 'Kwak Amber 25cl']
  const cocktailForfait = [...streek, ...aperitieven, ...cocktails]

  const fid = (naam: string, namen: string[], verwacht: number): number =>
    upsertForfait({
      naam,
      verwachte_consumpties_per_persoon: verwacht,
      handmatige_prijs: null,
      toegestane_drank_ids: ids(namen)
    }).id

  const frisId = fid('Forfait Fris', fris, 5)
  const basisId = fid('Forfait Basis', basis, 6)
  const streekId = fid('Forfait Streek', streek, 6)
  fid('Forfait Cocktail', cocktailForfait, 5)

  // Two demo parties, with a frozen price snapshot of today's prices.
  const snapshot = buildPrijsMomentopname()

  const huwelijk = upsertFeest({
    naam: 'Huwelijk Lena & Tom',
    type_feest: 'huwelijk',
    datum: '2026-05-30',
    publiek: 'Volwassenen',
    doelmarge: 0.05,
    korting_reden: null,
    prijs_momentopname: snapshot,
    toewijzingen: [
      { forfait_id: streekId, forfait_naam: 'Forfait Streek', aantal_personen: 80, forfaitprijs_per_persoon: 18 },
      { forfait_id: frisId, forfait_naam: 'Forfait Fris', aantal_personen: 20, forfaitprijs_per_persoon: 10 }
    ]
  })
  const huwelijkReg: Registratie[] = [
    { drank_id: drankIds.get('Stella Artois 25cl')!, aantal_vaten_geopend: 5, gewicht_laatste_vat_kg: 18 },
    { drank_id: drankIds.get('Hoegaarden 25cl')!, aantal_vaten_geopend: 2, gewicht_laatste_vat_kg: 22 },
    { drank_id: drankIds.get('Coca Cola')!, aantal_flessen: 28 },
    { drank_id: drankIds.get('Chaudfontaine plat')!, aantal_flessen: 18 },
    { drank_id: drankIds.get('Wit')!, aantal_flessen: 24 },
    { drank_id: drankIds.get('Rood')!, aantal_flessen: 16 },
    { drank_id: drankIds.get('Duvel')!, aantal_empties: 36 },
    { drank_id: drankIds.get('Cava')!, aantal_flessen: 12 },
    { drank_id: drankIds.get('Mojito')!, cocktail_tally: 22 }
  ]
  saveRegistraties(huwelijk.id, huwelijkReg)

  const scouts = upsertFeest({
    naam: 'Scoutsfeest De Vossen',
    type_feest: 'scoutsfeest',
    datum: '2026-04-12',
    publiek: 'Jong gezelschap',
    doelmarge: 0.0,
    korting_reden: 'sociaal doel — jeugdvereniging',
    prijs_momentopname: snapshot,
    toewijzingen: [
      { forfait_id: basisId, forfait_naam: 'Forfait Basis', aantal_personen: 60, forfaitprijs_per_persoon: 12 }
    ]
  })
  const scoutsReg: Registratie[] = [
    { drank_id: drankIds.get('Stella Artois 25cl')!, aantal_vaten_geopend: 4, gewicht_laatste_vat_kg: 14 },
    { drank_id: drankIds.get('Coca Cola')!, aantal_flessen: 22 },
    { drank_id: drankIds.get('Fanta Orange')!, aantal_flessen: 10 },
    { drank_id: drankIds.get('Chaudfontaine bruis')!, aantal_flessen: 14 },
    { drank_id: drankIds.get('Wit')!, aantal_flessen: 8 }
  ]
  saveRegistraties(scouts.id, scoutsReg)

  markDemoGeladen(true)
}
