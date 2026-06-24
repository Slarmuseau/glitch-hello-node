import { useState } from 'react'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { PageHeader, Card, Field, Badge, EmptyState } from '../components/ui'
import { NumberInput } from '../components/NumberInput'
import {
  brutoConsumptiesPerVat,
  nettoConsumptiesPerVat,
  kostprijsPerConsumptieUitVat,
  formatEuro,
  formatNumber,
  type Drank,
  type Vat
} from '@shared/domain'

export default function VolumesVerpakking(): JSX.Element {
  const dranken = useData(() => api.dranken.list())
  const vaten = useData(() => api.vaten.list())

  if (dranken.loading || vaten.loading) return <div className="text-ink-faint">Laden…</div>
  const lijst = dranken.data ?? []
  const vatList = vaten.data ?? []
  const reload = (): void => {
    dranken.reload()
    vaten.reload()
  }

  const save = async (d: Drank): Promise<void> => {
    await api.dranken.upsert(d)
    reload()
  }

  return (
    <div>
      <PageHeader
        title="Volumes en verpakking"
        subtitle="Hoe elke drank geschonken en gemeten wordt. Dit zet je één keer goed; daarna raak je het zelden aan. Deze pagina stuurt de omrekening na het feest."
      />

      <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2 px-1">
        Vaten
      </h2>
      <Vaten vaten={vatList} dranken={lijst} onChange={reload} />

      <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mt-8 mb-2 px-1">
        Schenkwijze per drank
      </h2>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
              <th className="px-4 py-3 font-medium">Drank</th>
              <th className="px-4 py-3 font-medium w-32">Schenkwijze</th>
              <th className="px-4 py-3 font-medium w-28">Glaasgrootte</th>
              <th className="px-4 py-3 font-medium">Verpakking</th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((d) => (
              <tr key={d.id} className="border-b border-cream-deep/60 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-ink">{d.naam}</div>
                  <div className="text-xs text-ink-faint">{d.categorie}</div>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    className="input"
                    value={d.schenkwijze}
                    onChange={(e) =>
                      save({ ...d, schenkwijze: e.target.value as Drank['schenkwijze'] })
                    }
                  >
                    <option value="per_stuk">per stuk</option>
                    <option value="uit_fles">uit fles</option>
                    <option value="uit_vat">uit vat</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <NumberInput
                    value={d.glaasgrootte_cl}
                    onCommit={(n) => save({ ...d, glaasgrootte_cl: n })}
                    suffix="cl"
                  />
                </td>
                <td className="px-4 py-2.5">
                  {d.schenkwijze === 'uit_fles' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-faint">Inhoud fles</span>
                      <div className="w-28">
                        <NumberInput
                          value={d.fles_inhoud_cl ?? 0}
                          onCommit={(n) => save({ ...d, fles_inhoud_cl: n })}
                          suffix="cl"
                        />
                      </div>
                    </div>
                  )}
                  {d.schenkwijze === 'uit_vat' && (
                    <select
                      className="input max-w-xs"
                      value={d.vat_id ?? ''}
                      onChange={(e) =>
                        save({ ...d, vat_id: e.target.value ? Number(e.target.value) : null })
                      }
                    >
                      <option value="">— kies een vat —</option>
                      {vatList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.naam}
                        </option>
                      ))}
                    </select>
                  )}
                  {d.schenkwijze === 'per_stuk' && (
                    <span className="text-xs text-ink-faint">
                      Geteld via leeggoed{d.is_cocktail ? ' / bereiding' : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-ink-faint mt-3">
        Tip: cocktails en mocktails worden bij bereiding geteld. Stel dat in via het vinkje bij de
        drank op de pagina “Dranken en prijzen”.
      </p>
    </div>
  )
}

function Vaten({
  vaten,
  dranken,
  onChange
}: {
  vaten: Vat[]
  dranken: Drank[]
  onChange: () => void
}): JSX.Element {
  const [open, setOpen] = useState<number | 'nieuw' | null>(null)

  const nieuw = async (): Promise<void> => {
    const v = await api.vaten.upsert({
      naam: 'Nieuw vat',
      gekoppelde_drank_id: null,
      leeg_gewicht_kg: 10,
      inhoud_liter: 30,
      dichtheid: 1.0,
      inkoopprijs_per_vat: 0,
      verlies_percentage: 5
    })
    onChange()
    setOpen(v.id)
  }

  if (vaten.length === 0) {
    return (
      <EmptyState title="Nog geen vaten">
        <button className="btn-primary mt-3" onClick={nieuw}>
          + Vat toevoegen
        </button>
      </EmptyState>
    )
  }

  return (
    <div className="space-y-3">
      {vaten.map((v) => {
        // Preview at the glass size of the first linked drink, else 25cl.
        const drank = dranken.find((d) => d.vat_id === v.id)
        const glas = drank?.glaasgrootte_cl ?? 25
        const bruto = brutoConsumptiesPerVat(v.inhoud_liter, glas)
        const netto = nettoConsumptiesPerVat(v.inhoud_liter, glas, v.verlies_percentage)
        const kost = kostprijsPerConsumptieUitVat(
          v.inkoopprijs_per_vat,
          v.inhoud_liter,
          glas,
          v.verlies_percentage
        )
        const editing = open === v.id
        return (
          <Card key={v.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-ink flex items-center gap-2">
                  {v.naam}
                  <Badge tone="plum">{formatNumber(v.inhoud_liter, 0)} L</Badge>
                </div>
                <div className="text-sm text-ink-soft mt-1">
                  Bij {glas}cl: {formatNumber(bruto, 0)} bruto →{' '}
                  <strong>{formatNumber(netto, 0)} glazen</strong> na {formatNumber(v.verlies_percentage)}%
                  verlies · {formatEuro(kost)} / glas
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setOpen(editing ? null : v.id)}>
                {editing ? 'Sluiten' : 'Bewerken'}
              </button>
            </div>
            {editing && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-cream-deep">
                <Field label="Naam">
                  <input
                    className="input"
                    defaultValue={v.naam}
                    onBlur={(e) => api.vaten.upsert({ ...v, naam: e.target.value }).then(onChange)}
                  />
                </Field>
                <Field label="Leeg gewicht (kg)">
                  <NumberInput
                    value={v.leeg_gewicht_kg}
                    onCommit={(n) => api.vaten.upsert({ ...v, leeg_gewicht_kg: n }).then(onChange)}
                  />
                </Field>
                <Field label="Inhoud (liter)">
                  <NumberInput
                    value={v.inhoud_liter}
                    onCommit={(n) => api.vaten.upsert({ ...v, inhoud_liter: n }).then(onChange)}
                  />
                </Field>
                <Field label="Dichtheid">
                  <NumberInput
                    value={v.dichtheid}
                    onCommit={(n) => api.vaten.upsert({ ...v, dichtheid: n }).then(onChange)}
                  />
                </Field>
                <Field label="Inkoopprijs (€/vat)" hint="Geschatte inkoopprijs">
                  <NumberInput
                    value={v.inkoopprijs_per_vat}
                    onCommit={(n) => api.vaten.upsert({ ...v, inkoopprijs_per_vat: n }).then(onChange)}
                  />
                </Field>
                <Field label="Verlies (%)" hint="Schuim en leiding">
                  <NumberInput
                    value={v.verlies_percentage}
                    onCommit={(n) =>
                      api.vaten.upsert({ ...v, verlies_percentage: n }).then(onChange)
                    }
                  />
                </Field>
                <div className="col-span-3 flex justify-end">
                  <button
                    className="btn-danger"
                    onClick={() => api.vaten.remove(v.id).then(onChange)}
                  >
                    Vat verwijderen
                  </button>
                </div>
              </div>
            )}
          </Card>
        )
      })}
      <button className="btn-outline" onClick={nieuw}>
        + Vat toevoegen
      </button>
    </div>
  )
}
