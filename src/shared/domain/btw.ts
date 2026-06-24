// VAT (BTW / TVA) helpers. Convention: all prices in Tapwijs are entered
// INCLUSIVE of VAT. The VAT contained in an inclusive amount at rate t% is
//   bedrag * t / (100 + t)

export function btwInBedrag(bedragIncl: number, tarief: number): number {
  if (!(tarief > 0) || !Number.isFinite(bedragIncl)) return 0
  return bedragIncl * (tarief / (100 + tarief))
}

export function exclBtw(bedragIncl: number, tarief: number): number {
  return bedragIncl - btwInBedrag(bedragIncl, tarief)
}
