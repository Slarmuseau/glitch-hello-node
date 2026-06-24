import { useState } from 'react'
import { api, type DrankInput } from '../lib/api'
import { useData } from '../lib/hooks'
import { vatMap, kostVoorDrank, menumarge, inkoopEenheid, SCHENKWIJZE_LABEL } from '../lib/calc'
import { PageHeader, Card, Percent, Badge, Modal, Field } from '../components/ui'
import { NumberInput } from '../components/NumberInput'
import { useToast } from '../components/Toast'
import { formatEuro, type Drank, type Vat, type Instellingen } from '@shared/domain'

export default function DrankenPrijzen(): JSX.Element {
  const toast = useToast()
  const dranken = useData(() => api.dranken.list())
  const vaten = useData(() => api.vaten.list())
  const inst = useData(() => api.instellingen.get())
  const [nieuwOpen, setNieuwOpen] = useState(false)

  if (dranken.loading || vaten.loading || inst.loading) return <Laden />
  const vmap = vatMap(vaten.data ?? [])
  const lijst = dranken.data ?? []
  const categorieen = (inst.data?.categorieen ?? []).length
    ? inst.data!.categorieen
    : [...new Set(lijst.map((d) => d.categorie))]

  const perCategorie = categorieen
    .map((cat) => ({ cat, items: lijst.filter((d) => d.categorie === cat) }))
    .filter((g) => g.items.length > 0)

  const reload = (): void => {
    dranken.reload()
    vaten.reload()
  }

  const saveInkoop = async (d: Drank, n: number): Promise<void> => {
    if (d.schenkwijze === 'uit_vat' && d.vat_id) {
      const vat = vmap.get(d.vat_id)
      if (vat) await api.vaten.upsert({ ...vat, inkoopprijs_per_vat: n })
    } else if (d.schenkwijze === 'uit_fles') {
      await api.dranken.upsert({ ...d, inkoopprijs_per_fles: n })
    } else {
      await api.dranken.upsert({ ...d, inkoopprijs_per_consumptie: n })
    }
    reload()
  }

  const inkoopWaarde = (d: Drank): number => {
    if (d.schenkwijze === 'uit_vat' && d.vat_id) return vmap.get(d.vat_id)?.inkoopprijs_per_vat ?? 0
    if (d.schenkwijze === 'uit_fles') return d.inkoopprijs_per_fles ?? 0
    return d.inkoopprijs_per_consumptie ?? 0
  }

  return (
    <div>
      <PageHeader
        title="Dranken en prijzen"
        subtitle="Wat je het vaakst aanpast: inkoop- en menuprijs per consumptie. De marge die in de menuprijs zit, zie je meteen."
        actions={
          <button className="btn-primary" onClick={() => setNieuwOpen(true)}>
            + Drank toevoegen
          </button>
        }
      />

      <Card className="mb-4 bg-amber-50/60 border-amber-100">
        <p className="text-sm text-ink-soft">
          De inkoopprijzen uit de demo zijn <strong>geschatte inkoopprijzen</strong>. Vervang ze
          door je eigen cijfers. De inkoop staat in de eenheid waarin je koopt: per stuk, per fles
          of per vat. De kostprijs per consumptie wordt automatisch berekend.
          <br />
          <strong>Alle prijzen zijn in euro (€), inclusief BTW.</strong>
        </p>
      </Card>

      <div className="space-y-6">
        {perCategorie.map(({ cat, items }) => (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2 px-1">
              {cat}
            </h2>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
                    <th className="px-4 py-3 font-medium">Drank</th>
                    <th className="px-4 py-3 font-medium w-44">Inkoopprijs (€)</th>
                    <th className="px-4 py-3 font-medium w-32">Menuprijs (€)</th>
                    <th className="px-4 py-3 font-medium w-40 text-right">Kost / consumptie</th>
                    <th className="px-4 py-3 font-medium w-32 text-right">Menumarge</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => {
                    const kost = kostVoorDrank(d, vmap)
                    const marge = menumarge(d, vmap)
                    const eenheid = inkoopEenheid(d)
                    return (
                      <tr key={d.id} className="border-b border-cream-deep/60 last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-ink">{d.naam}</div>
                          <div className="text-xs text-ink-faint">
                            {SCHENKWIJZE_LABEL[d.schenkwijze]}
                            {d.is_cocktail ? ' · cocktail' : ''} · glas {d.glaasgrootte_cl}cl
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <NumberInput
                            value={inkoopWaarde(d)}
                            onCommit={(n) => saveInkoop(d, n)}
                            suffix={eenheid.korte}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <NumberInput
                            value={d.menuprijs}
                            onCommit={(n) => api.dranken.upsert({ ...d, menuprijs: n }).then(reload)}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-soft">
                          {formatEuro(kost)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge tone={marge >= 0.4 ? 'good' : marge >= 0.2 ? 'amber' : 'bad'}>
                            <Percent value={marge} />
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        ))}
      </div>

      {nieuwOpen && (
        <NieuweDrankModal
          vaten={vaten.data ?? []}
          instellingen={inst.data!}
          onClose={() => setNieuwOpen(false)}
          onSaved={() => {
            setNieuwOpen(false)
            reload()
            toast('Drank toegevoegd', 'good')
          }}
        />
      )}
    </div>
  )
}

function Laden(): JSX.Element {
  return <div className="text-ink-faint">Laden…</div>
}

function NieuweDrankModal({
  vaten,
  instellingen,
  onClose,
  onSaved
}: {
  vaten: Vat[]
  instellingen: Instellingen
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const cats = instellingen.categorieen.length ? instellingen.categorieen : ['Soft']
  const [naam, setNaam] = useState('')
  const [categorie, setCategorie] = useState(cats[0])
  const [schenkwijze, setSchenkwijze] = useState<Drank['schenkwijze']>('per_stuk')
  const [isCocktail, setIsCocktail] = useState(false)
  const [menuprijs, setMenuprijs] = useState(0)
  const [glaasgrootte, setGlaasgrootte] = useState(
    instellingen.standaard_glaasgrootte_per_categorie[cats[0]] ?? 25
  )
  const [inkoop, setInkoop] = useState(0)
  const [flesInhoud, setFlesInhoud] = useState(150)
  const [vatId, setVatId] = useState<number | null>(vaten[0]?.id ?? null)

  const opslaan = async (): Promise<void> => {
    const d: DrankInput = {
      naam,
      categorie,
      menuprijs,
      glaasgrootte_cl: glaasgrootte,
      schenkwijze,
      is_cocktail: isCocktail,
      inkoopprijs_per_consumptie: schenkwijze === 'per_stuk' ? inkoop : null,
      fles_inhoud_cl: schenkwijze === 'uit_fles' ? flesInhoud : null,
      inkoopprijs_per_fles: schenkwijze === 'uit_fles' ? inkoop : null,
      vat_id: schenkwijze === 'uit_vat' ? vatId : null
    }
    await api.dranken.upsert(d)
    onSaved()
  }

  return (
    <Modal open title="Nieuwe drank" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Naam">
          <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} autoFocus />
        </Field>
        <Field label="Categorie">
          <select className="input" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Schenkwijze">
          <select
            className="input"
            value={schenkwijze}
            onChange={(e) => setSchenkwijze(e.target.value as Drank['schenkwijze'])}
          >
            <option value="per_stuk">per stuk</option>
            <option value="uit_fles">uit fles</option>
            <option value="uit_vat">uit vat</option>
          </select>
        </Field>
        <Field label="Menuprijs (€/consumptie)">
          <NumberInput value={menuprijs} onCommit={setMenuprijs} />
        </Field>
        <Field label="Glaasgrootte (cl)">
          <NumberInput value={glaasgrootte} onCommit={setGlaasgrootte} />
        </Field>
        {schenkwijze === 'per_stuk' && (
          <Field label="Inkoopprijs (€/consumptie)" hint="Geschatte inkoopprijs">
            <NumberInput value={inkoop} onCommit={setInkoop} />
          </Field>
        )}
        {schenkwijze === 'uit_fles' && (
          <>
            <Field label="Inhoud fles (cl)">
              <NumberInput value={flesInhoud} onCommit={setFlesInhoud} />
            </Field>
            <Field label="Inkoopprijs (€/fles)" hint="Geschatte inkoopprijs">
              <NumberInput value={inkoop} onCommit={setInkoop} />
            </Field>
          </>
        )}
        {schenkwijze === 'uit_vat' && (
          <Field label="Gekoppeld vat" hint="Beheer vaten op 'Volumes en verpakking'">
            <select
              className="input"
              value={vatId ?? ''}
              onChange={(e) => setVatId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— kies een vat —</option>
              {vaten.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.naam}
                </option>
              ))}
            </select>
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-ink-soft col-span-2">
          <input
            type="checkbox"
            checked={isCocktail}
            onChange={(e) => setIsCocktail(e.target.checked)}
          />
          Cocktail/mocktail — geteld bij bereiding (niet via leeggoed)
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn-ghost" onClick={onClose}>
          Annuleren
        </button>
        <button className="btn-primary" disabled={!naam} onClick={opslaan}>
          Opslaan
        </button>
      </div>
    </Modal>
  )
}
