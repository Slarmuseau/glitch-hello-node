import { useMemo, useState } from 'react'
import { api, type ForfaitInput, type ForfaitHistoriek } from '../lib/api'
import { useData } from '../lib/hooks'
import { vatMap, kostVoorDrank } from '../lib/calc'
import { PageHeader, Card, Field, Money, EmptyState } from '../components/ui'
import { NumberInput } from '../components/NumberInput'
import { useToast } from '../components/Toast'
import {
  suggestedForfaitPrijs,
  bufferConsumptiesPerHoofd,
  formatEuro,
  formatNumber,
  type Drank,
  type Forfait,
  type Vat,
  type Instellingen
} from '@shared/domain'

export default function Forfaits(): JSX.Element {
  const toast = useToast()
  const forfaits = useData(() => api.forfaits.list())
  const dranken = useData(() => api.dranken.list())
  const vaten = useData(() => api.vaten.list())
  const inst = useData(() => api.instellingen.get())
  const [editId, setEditId] = useState<number | 'nieuw' | null>(null)

  if (forfaits.loading || dranken.loading || vaten.loading || inst.loading) return <div className="text-ink-faint">Laden…</div>
  const lijst = forfaits.data ?? []
  const drankList = dranken.data ?? []
  const vmap = vatMap(vaten.data ?? [])
  const reload = (): void => forfaits.reload()

  return (
    <div>
      <PageHeader
        title="Forfaits"
        subtitle="De prijs zit al in de menuprijs. Een forfait is dus geen korting maar gemak: verwachte consumpties × menuprijs. De doelmarge is je ondergrens."
        actions={
          <button className="btn-primary" onClick={() => setEditId('nieuw')}>
            + Forfait
          </button>
        }
      />

      {lijst.length === 0 && editId !== 'nieuw' && (
        <EmptyState title="Nog geen forfaits">
          Maak een eerste forfait aan en vink de toegestane dranken aan.
        </EmptyState>
      )}

      <div className="space-y-4">
        {editId === 'nieuw' && (
          <ForfaitEditor
            dranken={drankList}
            instellingen={inst.data!}
            onClose={() => setEditId(null)}
            onSaved={() => {
              setEditId(null)
              reload()
              toast('Forfait opgeslagen', 'good')
            }}
          />
        )}
        {lijst.map((f) =>
          editId === f.id ? (
            <ForfaitEditor
              key={f.id}
              forfait={f}
              dranken={drankList}
              instellingen={inst.data!}
              onClose={() => setEditId(null)}
              onSaved={() => {
                setEditId(null)
                reload()
                toast('Forfait opgeslagen', 'good')
              }}
              onDelete={() => {
                api.forfaits.remove(f.id).then(() => {
                  setEditId(null)
                  reload()
                  toast('Forfait verwijderd')
                })
              }}
            />
          ) : (
            <ForfaitKaart
              key={f.id}
              forfait={f}
              dranken={drankList}
              vmap={vmap}
              doelmarge={inst.data!.standaard_doelmarge}
              onEdit={() => setEditId(f.id)}
            />
          )
        )}
      </div>
    </div>
  )
}

function tierStats(f: Forfait, dranken: Drank[], vmap: Map<number, Vat>) {
  const toegestaan = dranken.filter((d) => f.toegestane_drank_ids.includes(d.id))
  const kosten = toegestaan.map((d) => kostVoorDrank(d, vmap))
  const menus = toegestaan.map((d) => d.menuprijs)
  const gemMenu = menus.length ? menus.reduce((a, b) => a + b, 0) / menus.length : 0
  const gemKost = kosten.length ? kosten.reduce((a, b) => a + b, 0) / kosten.length : 0
  const worstKost = kosten.length ? Math.max(...kosten) : 0
  const worstDrank = toegestaan[kosten.indexOf(worstKost)]
  return { toegestaan, gemMenu, gemKost, worstKost, worstDrank }
}

function prijsVan(f: Forfait, gemMenu: number): { prijs: number; bron: string } {
  if (f.handmatige_prijs != null) return { prijs: f.handmatige_prijs, bron: 'vaste prijs' }
  if (f.verwachte_consumpties_per_persoon != null)
    return {
      prijs: suggestedForfaitPrijs(f.verwachte_consumpties_per_persoon, gemMenu),
      bron: `${formatNumber(f.verwachte_consumpties_per_persoon)} × gem. menuprijs`
    }
  return { prijs: 0, bron: 'nog geen prijs' }
}

function ForfaitKaart({
  forfait,
  dranken,
  vmap,
  doelmarge,
  onEdit
}: {
  forfait: Forfait
  dranken: Drank[]
  vmap: Map<number, Vat>
  doelmarge: number
  onEdit: () => void
}): JSX.Element {
  const { toegestaan, gemMenu, worstKost, worstDrank } = tierStats(forfait, dranken, vmap)
  const { prijs, bron } = prijsVan(forfait, gemMenu)
  const buffer = bufferConsumptiesPerHoofd(prijs, gemMenu, doelmarge)

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg text-ink">{forfait.naam}</h3>
          <div className="text-xs text-ink-faint mt-0.5">{toegestaan.length} dranken toegestaan</div>
        </div>
        <button className="btn-ghost" onClick={onEdit}>
          Bewerken
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Prijs / persoon</div>
          <div className="text-2xl font-display tabular text-ink mt-1">{formatEuro(prijs)}</div>
          <div className="text-xs text-ink-faint">{bron}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Gem. menuprijs</div>
          <div className="text-2xl font-display tabular text-ink-soft mt-1">{formatEuro(gemMenu)}</div>
          <div className="text-xs text-ink-faint">prijs per glas</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Duurste cons.</div>
          <div className="text-2xl font-display tabular text-clay-500 mt-1">{formatEuro(worstKost)}</div>
          <div className="text-xs text-ink-faint truncate">{worstDrank?.naam ?? '—'} (risico)</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Bufferlijn</div>
          <div className="text-2xl font-display tabular text-sage-600 mt-1">
            {Number.isFinite(buffer) ? formatNumber(buffer, 0) : '∞'}
          </div>
          <div className="text-xs text-ink-faint">cons./hoofd tot per-glas-pariteit</div>
        </div>
      </div>

      {prijs > 0 && Number.isFinite(buffer) && (
        <p className="text-sm text-ink-soft mt-4 bg-cream rounded-xl px-4 py-3">
          Bij <Money value={prijs} className="font-medium" /> brengt het forfait evenveel op als
          verkoop per glas tot <strong>{formatNumber(buffer, 0)} consumpties per hoofd</strong>.
          Drinkt een gast minder, dan win je; meer, dan geef je terug.
        </p>
      )}
    </Card>
  )
}

function ForfaitEditor({
  forfait,
  dranken,
  instellingen,
  onClose,
  onSaved,
  onDelete
}: {
  forfait?: Forfait
  dranken: Drank[]
  instellingen: Instellingen
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}): JSX.Element {
  const [naam, setNaam] = useState(forfait?.naam ?? '')
  const [verwacht, setVerwacht] = useState<number | null>(
    forfait?.verwachte_consumpties_per_persoon ?? null
  )
  const [handmatig, setHandmatig] = useState<number | null>(forfait?.handmatige_prijs ?? null)
  const [gekozen, setGekozen] = useState<Set<number>>(
    new Set(forfait?.toegestane_drank_ids ?? [])
  )
  const [historiek, setHistoriek] = useState<ForfaitHistoriek | null>(null)

  const categorieen = useMemo(() => {
    const cats = instellingen.categorieen.length
      ? instellingen.categorieen
      : [...new Set(dranken.map((d) => d.categorie))]
    return cats
      .map((c) => ({ cat: c, items: dranken.filter((d) => d.categorie === c) }))
      .filter((g) => g.items.length)
  }, [dranken, instellingen])

  const toegestaan = dranken.filter((d) => gekozen.has(d.id))
  const gemMenu = toegestaan.length
    ? toegestaan.reduce((s, d) => s + d.menuprijs, 0) / toegestaan.length
    : 0
  const suggestie = verwacht != null ? suggestedForfaitPrijs(verwacht, gemMenu) : 0

  const toggle = (id: number): void =>
    setGekozen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const opslaan = async (): Promise<void> => {
    const payload: ForfaitInput = {
      id: forfait?.id,
      naam,
      verwachte_consumpties_per_persoon: verwacht,
      handmatige_prijs: handmatig,
      toegestane_drank_ids: [...gekozen]
    }
    await api.forfaits.upsert(payload)
    onSaved()
  }

  const haalHistoriek = async (): Promise<void> => {
    if (!forfait) return
    setHistoriek(await api.forfaits.historiek(forfait.id, instellingen.standaard_doelmarge))
  }

  return (
    <Card className="border-amber-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-ink">{forfait ? 'Forfait bewerken' : 'Nieuw forfait'}</h3>
        <button className="btn-ghost px-2 py-1" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Naam">
          <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} autoFocus />
        </Field>
        <Field label="Verwachte consumpties / persoon" hint="Vroege fase: stuurt de richtprijs">
          <NumberInput value={verwacht ?? undefined} onCommit={(n) => setVerwacht(n)} placeholder="bv. 6" />
        </Field>
        <Field label="Vaste prijs / persoon (optioneel)" hint="Laat leeg om de richtprijs te volgen">
          <NumberInput
            value={handmatig ?? undefined}
            onCommit={(n) => setHandmatig(n || null)}
            placeholder="—"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-cream rounded-xl px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-ink-faint">Richtprijs (uit verwachting)</div>
          <div className="text-xl font-display tabular text-ink mt-1">
            {verwacht != null ? formatEuro(suggestie) : '—'}
          </div>
          <div className="text-xs text-ink-faint">
            {verwacht != null
              ? `${formatNumber(verwacht)} × gem. menuprijs ${formatEuro(gemMenu)}`
              : 'vul verwachte consumpties in'}
          </div>
        </div>
        <div className="bg-cream rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-ink-faint">Prijs uit historiek</div>
            {forfait && (
              <button className="text-xs text-amber-700 hover:underline" onClick={haalHistoriek}>
                berekenen
              </button>
            )}
          </div>
          <div className="text-xl font-display tabular text-ink mt-1">
            {historiek?.voorgestelde_prijs != null ? formatEuro(historiek.voorgestelde_prijs) : '—'}
          </div>
          <div className="text-xs text-ink-faint">
            {historiek
              ? historiek.aantal_feesten > 0
                ? `${historiek.aantal_feesten} feest(en), tegen prijzen van vandaag`
                : 'nog geen feesten met dit forfait'
              : forfait
                ? 'klik “berekenen” voor een voorstel uit je geschiedenis'
                : 'beschikbaar na opslaan'}
          </div>
        </div>
      </div>

      <div className="label mb-2">Toegestane dranken ({gekozen.size})</div>
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {categorieen.map(({ cat, items }) => (
          <div key={cat}>
            <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">{cat}</div>
            <div className="flex flex-wrap gap-2">
              {items.map((d) => {
                const aan = gekozen.has(d.id)
                return (
                  <button
                    key={d.id}
                    onClick={() => toggle(d.id)}
                    className={`pill border transition-colors ${
                      aan
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'border-cream-deep text-ink-soft hover:bg-cream-deep'
                    }`}
                  >
                    {d.naam} · {formatEuro(d.menuprijs)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6">
        <div>
          {onDelete && (
            <button className="btn-danger" onClick={onDelete}>
              Verwijderen
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-primary" disabled={!naam} onClick={opslaan}>
            Opslaan
          </button>
        </div>
      </div>
    </Card>
  )
}
