// Price snapshots. When a party is saved, every drink's derived purchase cost
// and menu price are frozen, so updating prices next spring never rewrites last
// summer's margins.

import { kostprijsPerConsumptie, type PrijsMomentopname, type Vat } from '@shared/domain'
import { listDranken, listVaten } from '../db/repo'

export function buildPrijsMomentopname(): PrijsMomentopname {
  const vaten = new Map<number, Vat>(listVaten().map((v) => [v.id, v]))
  const snapshot: PrijsMomentopname = {}
  for (const d of listDranken()) {
    const vat = d.vat_id ? vaten.get(d.vat_id) : null
    snapshot[d.id] = {
      drank_id: d.id,
      inkoopprijs: kostprijsPerConsumptie(d, vat),
      menuprijs: d.menuprijs
    }
  }
  return snapshot
}
