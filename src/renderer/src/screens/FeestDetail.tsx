import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type FeestVol, type Toewijzing, type Registratie } from '../lib/api'
import { useData } from '../lib/hooks'
import { vatMap, TYPE_FEEST_LABEL, TYPE_FEEST_OPTIES } from '../lib/calc'
import { PageHeader, Card, Field, Badge } from '../components/ui'
import { NumberInput } from '../components/NumberInput'
import { useToast } from '../components/Toast'
import { MobielModal } from '../components/MobielModal'
import { suggestedForfaitPrijs, formatEuro, type Drank, type Forfait, type Vat } from '@shared/domain'

export default function FeestDetail(): JSX.Element {
  const { id } = useParams()
  const feestId = Number(id)
  const nav = useNavigate()
  const toast = useToast()

  const feest = useData(() => api.feesten.get(feestId), [feestId])
  const forfaits = useData(() => api.forfaits.list())
  const dranken = useData(() => api.dranken.list())
  const vaten = useData(() => api.vaten.list())

  if (feest.loading || forfaits.loading || dranken.loading || vaten.loading)
    return <div className="text-ink-faint">Laden…</div>
  if (!feest.data) return <div className="text-ink-faint">Feest niet gevonden.</div>

  return (
    <FeestForm
      feest={feest.data}
      forfaits={forfaits.data ?? []}
      dranken={dranken.data ?? []}
      vaten={vaten.data ?? []}
      onSaved={() => feest.reload()}
      onResultaat={() => nav(`/feesten/${feestId}/resultaat`)}
      onBlad={() => nav(`/feesten/${feestId}/blad`)}
      onDeleted={() => nav('/feesten')}
      toast={toast}
    />
  )
}

function forfaitPrijs(f: Forfait, dranken: Drank[]): number {
  if (f.handmatige_prijs != null) return f.handmatige_prijs
  const toegestaan = dranken.filter((d) => f.toegestane_drank_ids.includes(d.id))
  const gemMenu = toegestaan.length
    ? toegestaan.reduce((s, d) => s + d.menuprijs, 0) / toegestaan.length
    : 0
  return f.verwachte_consumpties_per_persoon != null
    ? suggestedForfaitPrijs(f.verwachte_consumpties_per_persoon, gemMenu)
    : 0
}

function FeestForm({
  feest,
  forfaits,
  dranken,
  vaten,
  onSaved,
  onResultaat,
  onBlad,
  onDeleted,
  toast
}: {
  feest: FeestVol
  forfaits: Forfait[]
  dranken: Drank[]
  vaten: Vat[]
  onSaved: () => void
  onResultaat: () => void
  onBlad: () => void
  onDeleted: () => void
  toast: (t: string, tone?: 'info' | 'good' | 'bad') => void
}): JSX.Element {
  const vmap = vatMap(vaten)
  const [naam, setNaam] = useState(feest.naam)
  const [type, setType] = useState<string>(feest.type_feest)
  const [datum, setDatum] = useState(feest.datum)
  const [publiek, setPubliek] = useState(feest.publiek ?? '')
  const [doelmarge, setDoelmarge] = useState(feest.doelmarge)
  const [kortingReden, setKortingReden] = useState(feest.korting_reden ?? '')
  const [toewijzingen, setToewijzingen] = useState<Toewijzing[]>(
    feest.toewijzingen.map((t) => ({ ...t }))
  )
  const [alleDranken, setAlleDranken] = useState(false)
  const [mobielOpen, setMobielOpen] = useState(false)

  // Registration state keyed by drank id.
  const [reg, setReg] = useState<Map<number, Registratie>>(() => {
    const m = new Map<number, Registratie>()
    for (const r of feest.registraties) m.set(r.drank_id, { ...r })
    return m
  })

  const setRegVeld = (drankId: number, veld: keyof Registratie, val: number): void =>
    setReg((prev) => {
      const next = new Map(prev)
      const cur = next.get(drankId) ?? { drank_id: drankId }
      next.set(drankId, { ...cur, drank_id: drankId, [veld]: val })
      return next
    })

  const toegestaneIds = useMemo(() => {
    const ids = new Set<number>()
    for (const t of toewijzingen) {
      const f = forfaits.find((x) => x.id === t.forfait_id)
      f?.toegestane_drank_ids.forEach((i) => ids.add(i))
    }
    return ids
  }, [toewijzingen, forfaits])

  const teTonen = alleDranken ? dranken : dranken.filter((d) => toegestaneIds.has(d.id))
  const aantalPersonen = toewijzingen.reduce((s, t) => s + t.aantal_personen, 0)

  const bewaarFeest = async (): Promise<void> => {
    await api.feesten.upsert({
      id: feest.id,
      naam,
      type_feest: type,
      datum,
      publiek: publiek || null,
      doelmarge,
      korting_reden: kortingReden || null,
      prijs_momentopname: feest.prijs_momentopname,
      toewijzingen
    })
    onSaved()
    toast('Feest opgeslagen', 'good')
  }

  const herneemSnapshot = async (): Promise<void> => {
    const snapshot = await api.snapshot.build()
    await api.feesten.upsert({
      id: feest.id,
      naam,
      type_feest: type,
      datum,
      publiek: publiek || null,
      doelmarge,
      korting_reden: kortingReden || null,
      prijs_momentopname: snapshot,
      toewijzingen
    })
    onSaved()
    toast('Prijzen opnieuw vastgelegd', 'good')
  }

  const bewaarRegistratie = async (): Promise<void> => {
    await bewaarFeest()
    await api.feesten.saveRegistraties(feest.id, [...reg.values()])
    toast('Registratie opgeslagen', 'good')
    onResultaat()
  }

  const verwijder = async (): Promise<void> => {
    if (!confirm('Dit feest verwijderen?')) return
    await api.feesten.remove(feest.id)
    onDeleted()
  }

  return (
    <div>
      <PageHeader
        title={naam || 'Feest'}
        subtitle="Eerst de opzet en de toewijzingen. Daarna, na het feest, de registratie van wat er gedronken is."
        actions={
          <>
            <button className="btn-ghost" onClick={verwijder}>
              Verwijderen
            </button>
            <button className="btn-outline" onClick={onBlad}>
              Afdrukbaar blad
            </button>
            <button className="btn-outline" onClick={bewaarFeest}>
              Opslaan
            </button>
          </>
        }
      />

      {/* SETUP */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">Opzet</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Naam">
            <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} />
          </Field>
          <Field label="Type feest">
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_FEEST_OPTIES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_FEEST_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Datum">
            <input
              type="date"
              className="input"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </Field>
          <Field label="Publiek (optioneel)">
            <input className="input" value={publiek} onChange={(e) => setPubliek(e.target.value)} />
          </Field>
          <Field label="Doel (%)" hint="Doel voor dit feest: % boven verkoop per glas">
            <NumberInput
              value={doelmarge * 100}
              onCommit={(n) => setDoelmarge(n / 100)}
              suffix="%"
            />
          </Field>
          <Field label="Reden korting (optioneel)">
            <input
              className="input"
              value={kortingReden}
              onChange={(e) => setKortingReden(e.target.value)}
              placeholder="klein feest, sociaal doel…"
            />
          </Field>
        </div>
      </Card>

      {/* TOEWIJZINGEN */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide">
            Toewijzingen · {aantalPersonen} personen
          </h2>
          <button
            className="btn-outline"
            onClick={() =>
              setToewijzingen((prev) => [
                ...prev,
                {
                  forfait_id: forfaits[0]?.id ?? null,
                  forfait_naam: forfaits[0]?.naam ?? '',
                  aantal_personen: 0,
                  forfaitprijs_per_persoon: forfaits[0] ? forfaitPrijs(forfaits[0], dranken) : 0,
                  korting_pct: 0
                }
              ])
            }
          >
            + Groep
          </button>
        </div>
        {toewijzingen.length === 0 && (
          <p className="text-sm text-ink-faint">
            Voeg minstens één groep toe (forfait + aantal personen + prijs per persoon).
          </p>
        )}
        <div className="space-y-3">
          {toewijzingen.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-4">
                <Field label="Forfait">
                  <select
                    className="input"
                    value={t.forfait_id ?? ''}
                    onChange={(e) => {
                      const fid = e.target.value ? Number(e.target.value) : null
                      const f = forfaits.find((x) => x.id === fid)
                      setToewijzingen((prev) =>
                        prev.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                forfait_id: fid,
                                forfait_naam: f?.naam ?? '',
                                forfaitprijs_per_persoon: f
                                  ? forfaitPrijs(f, dranken)
                                  : x.forfaitprijs_per_persoon
                              }
                            : x
                        )
                      )
                    }}
                  >
                    <option value="">— kies forfait —</option>
                    {forfaits.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.naam}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Personen">
                  <NumberInput
                    value={t.aantal_personen}
                    onCommit={(n) =>
                      setToewijzingen((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, aantal_personen: n } : x))
                      )
                    }
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Prijs / persoon">
                  <NumberInput
                    value={t.forfaitprijs_per_persoon}
                    onCommit={(n) =>
                      setToewijzingen((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, forfaitprijs_per_persoon: n } : x))
                      )
                    }
                    suffix="€"
                  />
                </Field>
              </div>
              <div className="col-span-3">
                <Field
                  label="Korting"
                  hint={
                    (t.korting_pct ?? 0) > 0
                      ? `netto ${formatEuro(t.forfaitprijs_per_persoon * (1 - (t.korting_pct ?? 0) / 100))}/pers`
                      : 'korting voor de klant'
                  }
                >
                  <NumberInput
                    value={t.korting_pct ?? 0}
                    onCommit={(n) =>
                      setToewijzingen((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, korting_pct: n } : x))
                      )
                    }
                    suffix="%"
                  />
                </Field>
              </div>
              <div className="col-span-1">
                <button
                  className="btn-danger w-full"
                  onClick={() =>
                    setToewijzingen((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-ink-faint mt-4 flex items-center gap-2">
          <Badge tone="plum">momentopname</Badge>
          Prijzen zijn vastgelegd bij het aanmaken.
          <button className="text-amber-700 hover:underline" onClick={herneemSnapshot}>
            opnieuw vastleggen
          </button>
        </div>
      </Card>

      {/* POST-PARTY ENTRY */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide">
            Registratie na het feest
          </h2>
          <div className="flex items-center gap-4">
            <button className="text-xs text-amber-700 hover:underline" onClick={() => setMobielOpen(true)}>
              📱 Open op gsm
            </button>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={alleDranken}
                onChange={(e) => setAlleDranken(e.target.checked)}
              />
              Toon alle dranken
            </label>
          </div>
        </div>
        <p className="text-xs text-ink-faint mb-4">
          Tel het leeggoed, de lege flessen, de aangebroken vaten en de cocktails. In zestig
          seconden, niet in twintig minuten.
        </p>

        {teTonen.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Kies eerst een forfait bij de toewijzingen, of zet “Toon alle dranken” aan.
          </p>
        ) : (
          <div className="space-y-1.5">
            {teTonen.map((d) => (
              <RegistratieRij
                key={d.id}
                drank={d}
                vat={d.vat_id ? vmap.get(d.vat_id) : undefined}
                reg={reg.get(d.id)}
                onSet={(veld, val) => setRegVeld(d.id, veld, val)}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-cream-deep">
          <button className="btn-outline" onClick={bewaarFeest}>
            Opslaan zonder resultaat
          </button>
          <button className="btn-primary" onClick={bewaarRegistratie}>
            Bewaar en bekijk resultaat →
          </button>
        </div>
      </Card>

      {mobielOpen && (
        <MobielModal pad={`/feesten/${feest.id}`} onClose={() => setMobielOpen(false)} />
      )}
    </div>
  )
}

function RegistratieRij({
  drank,
  vat,
  reg,
  onSet
}: {
  drank: Drank
  vat?: Vat
  reg?: Registratie
  onSet: (veld: keyof Registratie, val: number) => void
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-cream/60">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink truncate">{drank.naam}</div>
        <div className="text-xs text-ink-faint">
          {drank.categorie} · glas {drank.glaasgrootte_cl}cl
        </div>
      </div>

      {drank.is_cocktail ? (
        <Veld label="geteld" w="w-28">
          <NumberInput value={reg?.cocktail_tally ?? undefined} onCommit={(n) => onSet('cocktail_tally', n)} />
        </Veld>
      ) : drank.schenkwijze === 'per_stuk' ? (
        <Veld label="leeggoed" w="w-28">
          <NumberInput value={reg?.aantal_empties ?? undefined} onCommit={(n) => onSet('aantal_empties', n)} />
        </Veld>
      ) : drank.schenkwijze === 'uit_fles' ? (
        <Veld label="lege flessen" w="w-28">
          <NumberInput value={reg?.aantal_flessen ?? undefined} onCommit={(n) => onSet('aantal_flessen', n)} />
        </Veld>
      ) : (
        <>
          <Veld label="vaten open" w="w-24">
            <NumberInput
              value={reg?.aantal_vaten_geopend ?? undefined}
              onCommit={(n) => onSet('aantal_vaten_geopend', n)}
            />
          </Veld>
          <Veld label="laatste vat (kg)" w="w-28">
            <NumberInput
              value={reg?.gewicht_laatste_vat_kg ?? undefined}
              onCommit={(n) => onSet('gewicht_laatste_vat_kg', n)}
            />
          </Veld>
          {vat && (
            <span className="text-[11px] text-ink-faint w-20 shrink-0">leeg {vat.leeg_gewicht_kg}kg</span>
          )}
        </>
      )}
    </div>
  )
}

function Veld({
  label,
  w,
  children
}: {
  label: string
  w: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className={`${w} shrink-0`}>
      <div className="text-[10px] uppercase tracking-wide text-ink-faint mb-0.5">{label}</div>
      {children}
    </div>
  )
}
