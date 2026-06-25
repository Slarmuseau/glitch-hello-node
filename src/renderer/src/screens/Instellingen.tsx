import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { PageHeader, Card, Field } from '../components/ui'
import { NumberInput } from '../components/NumberInput'
import { useToast } from '../components/Toast'
import { TYPE_FEEST_LABEL, TYPE_FEEST_OPTIES, DUREN, duurLabel } from '../lib/calc'
import {
  STANDAARD_DUUR_AANPASSINGEN,
  type Instellingen as InstellingenType,
  type MargeConventie,
  type TypeFeestConfig
} from '@shared/domain'

export default function Instellingen(): JSX.Element {
  const toast = useToast()
  const inst = useData(() => api.instellingen.get())
  const demo = useData(() => api.demo.status())
  const dbPath = useData(() => api.data.dbPath())

  if (inst.loading) return <div className="text-ink-faint">Laden…</div>
  const data = inst.data!

  const save = async (patch: Partial<InstellingenType>): Promise<void> => {
    await api.instellingen.save({ ...data, ...patch })
    inst.reload()
  }

  return (
    <div>
      <PageHeader title="Instellingen" subtitle="Alles is hier aanpasbaar — geen config-bestanden, geen verborgen knoppen." />

      <div className="space-y-5">
        {/* Marge */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">Marge</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Doel: % méér dan verkoop per glas"
              hint="0% = even goed als per glas. Enkele % is een mooi doel."
            >
              <NumberInput
                value={data.standaard_doelmarge * 100}
                onCommit={(n) => save({ standaard_doelmarge: n / 100 })}
                suffix="%"
              />
            </Field>
            <Field
              label="Marge-conventie (2de inzicht)"
              hint="Enkel voor de marge op inkoopkost; het forfait zelf is niet kost-plus."
            >
              <select
                className="input"
                value={data.marge_conventie}
                onChange={(e) => save({ marge_conventie: e.target.value as MargeConventie })}
              >
                <option value="op_de_omzet">op de omzet — prijs = kost ÷ (1 − marge)</option>
                <option value="opslag_op_kostprijs">opslag op kostprijs — prijs = kost × (1 + marge)</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Bedrijf */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">Bedrijfsgegevens</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Naam zaak">
              <input
                className="input"
                defaultValue={data.bedrijfsnaam}
                onBlur={(e) => save({ bedrijfsnaam: e.target.value })}
              />
            </Field>
            <div>
              <span className="label">Logo van de zaak</span>
              <LogoKiezer logo={data.logo_pad} onChange={(v) => save({ logo_pad: v })} />
            </div>
            <Field label="Adres en gegevens">
              <textarea
                className="input min-h-[80px]"
                defaultValue={data.bedrijfsgegevens}
                onBlur={(e) => save({ bedrijfsgegevens: e.target.value })}
              />
            </Field>
            <Field label="Anthropic API-sleutel" hint="Optioneel, voor het later inlezen van foto's van de bladen">
              <input
                className="input"
                type="password"
                defaultValue={data.anthropic_api_key ?? ''}
                onBlur={(e) => save({ anthropic_api_key: e.target.value || null })}
              />
            </Field>
          </div>
        </Card>

        {/* Categorieen */}
        <CategorieBeheer data={data} onSave={save} />

        {/* Duur & prijs per type feest */}
        <DuurBeheer data={data} onSave={save} />

        {/* Data */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">
            Gegevens en back-up
          </h2>
          <p className="text-sm text-ink-soft mb-4">
            Je gegevens staan in één lokaal bestand op deze computer. Maak er gerust een kopie van.
          </p>
          <div className="bg-cream rounded-xl px-4 py-3 text-xs text-ink-soft mb-4 break-all">
            <span className="text-ink-faint">Gegevensbestand:</span> {dbPath.data ?? '…'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-outline"
              onClick={() => api.data.revealDb().then((r) => r.ok && toast(`Map geopend (${r.naam})`))}
            >
              Toon bestand in map
            </button>
            <button
              className="btn-outline"
              onClick={() => api.data.backup().then((r) => r.ok && toast('Reservekopie gemaakt', 'good'))}
            >
              Reservekopie maken
            </button>
            <button
              className="btn-outline"
              onClick={() => api.data.exportAlles().then((r) => r.ok && toast('Geëxporteerd', 'good'))}
            >
              Alles exporteren (JSON)
            </button>
            <button
              className="btn-outline"
              onClick={() => api.data.exportCsv().then((r) => r.ok && toast('CSV geëxporteerd', 'good'))}
            >
              Dranken naar Excel (CSV)
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                if (!confirm('Huidige gegevens vervangen door een import?')) return
                const r = await api.data.importAlles()
                if (r.ok) {
                  toast('Geïmporteerd', 'good')
                  inst.reload()
                  demo.reload()
                }
              }}
            >
              Importeren (JSON)
            </button>
          </div>
        </Card>

        {/* Demo */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">Demo-gegevens</h2>
          <p className="text-sm text-ink-soft mb-4">
            {demo.data?.geladen
              ? 'De app is gevuld met voorbeeldgegevens. Wis ze als je met je eigen cijfers wil starten.'
              : 'Er zijn momenteel geen demo-gegevens als zodanig gemarkeerd.'}
          </p>
          <button
            className="btn-danger"
            onClick={async () => {
              if (!confirm('Alle dranken, vaten, forfaits en feesten wissen?')) return
              await api.demo.wis()
              toast('Alle gegevens gewist')
              demo.reload()
              inst.reload()
            }}
          >
            Alle gegevens wissen
          </button>
        </Card>
      </div>
    </div>
  )
}

function LogoKiezer({
  logo,
  onChange
}: {
  logo: string | null | undefined
  onChange: (v: string | null) => void
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const kies = (file?: File): void => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result))
    reader.readAsDataURL(file)
  }
  return (
    <div>
      {logo ? (
        <img
          src={logo}
          alt="Logo"
          className="h-16 max-w-[220px] object-contain mb-2 rounded-md border border-cream-deep bg-white p-1"
        />
      ) : (
        <div className="text-xs text-ink-faint mb-2">Nog geen logo gekozen.</div>
      )}
      <div className="flex gap-2">
        <button className="btn-outline" onClick={() => inputRef.current?.click()}>
          Logo kiezen
        </button>
        {logo && (
          <button className="btn-ghost" onClick={() => onChange(null)}>
            Verwijderen
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => kies(e.target.files?.[0])}
      />
      <span className="block text-xs text-ink-faint mt-1">
        Verschijnt op het afdrukblad en het overzicht. PNG of JPG.
      </span>
    </div>
  )
}

function DuurBeheer({
  data,
  onSave
}: {
  data: InstellingenType
  onSave: (patch: Partial<InstellingenType>) => Promise<void>
}): JSX.Element {
  const config = data.type_feest_config ?? {}
  const cfgVoor = (t: string): TypeFeestConfig =>
    config[t] ?? { standaardduur: 1.5, aanpassingen: STANDAARD_DUUR_AANPASSINGEN.map((x) => ({ ...x })) }
  const pctVoor = (t: string, duur: number): number =>
    cfgVoor(t).aanpassingen.find((a) => a.duur === duur)?.pct ?? 0
  const update = (t: string, next: TypeFeestConfig): Promise<void> =>
    onSave({ type_feest_config: { ...config, [t]: next } })

  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">
        Duur en prijs per type feest
      </h2>
      <p className="text-sm text-ink-soft mb-4">
        Stel per type een standaardduur in, en de prijsaanpassing (%) per duur t.o.v. de
        standaardprijs. Vrij instelbaar (hoeft niet lineair te zijn). Dezelfde aanpassing schaalt
        ook de verwachte consumpties.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
            <th className="py-2 pr-3 font-medium">Type feest</th>
            <th className="py-2 px-3 font-medium">Standaardduur</th>
            {DUREN.map((d) => (
              <th key={d} className="py-2 px-3 font-medium text-right">
                {duurLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TYPE_FEEST_OPTIES.map((t) => {
            const c = cfgVoor(t)
            return (
              <tr key={t} className="border-b border-cream-deep/60 last:border-0">
                <td className="py-2 pr-3 text-ink">{TYPE_FEEST_LABEL[t]}</td>
                <td className="py-2 px-3">
                  <select
                    className="input w-24"
                    value={c.standaardduur}
                    onChange={(e) => update(t, { ...c, standaardduur: Number(e.target.value) })}
                  >
                    {DUREN.map((d) => (
                      <option key={d} value={d}>
                        {duurLabel(d)}
                      </option>
                    ))}
                  </select>
                </td>
                {DUREN.map((d) => (
                  <td key={d} className="py-2 px-3 w-24">
                    <NumberInput
                      value={pctVoor(t, d)}
                      onCommit={(n) =>
                        update(t, {
                          ...c,
                          aanpassingen: DUREN.map((dd) => ({
                            duur: dd,
                            pct: dd === d ? n : pctVoor(t, dd)
                          }))
                        })
                      }
                      suffix="%"
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function CategorieBeheer({
  data,
  onSave
}: {
  data: InstellingenType
  onSave: (patch: Partial<InstellingenType>) => Promise<void>
}): JSX.Element {
  const [nieuw, setNieuw] = useState('')
  const cats = data.categorieen

  const muteer = (next: string[]): Promise<void> => onSave({ categorieen: next })

  const hernoem = (oud: string, nieuwNaam: string): Promise<void> => {
    const next = cats.map((c) => (c === oud ? nieuwNaam : c))
    const glas = { ...data.standaard_glaasgrootte_per_categorie }
    if (glas[oud] != null) {
      glas[nieuwNaam] = glas[oud]
      delete glas[oud]
    }
    return onSave({ categorieen: next, standaard_glaasgrootte_per_categorie: glas })
  }

  const verplaats = (i: number, richting: -1 | 1): Promise<void> => {
    const j = i + richting
    if (j < 0 || j >= cats.length) return Promise.resolve()
    const next = [...cats]
    ;[next[i], next[j]] = [next[j], next[i]]
    return muteer(next)
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">Categorieën</h2>
      <p className="text-sm text-ink-soft mb-4">
        Voeg toe, hernoem, verwijder en herschik je eigen categorieën. Stel per categorie een
        standaard glaasgrootte in, zodat een nieuwe drank zinvolle waarden erft.
      </p>
      <div className="space-y-2">
        {cats.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <div className="flex flex-col">
              <button className="text-ink-faint hover:text-ink leading-none" onClick={() => verplaats(i, -1)}>
                ▲
              </button>
              <button className="text-ink-faint hover:text-ink leading-none" onClick={() => verplaats(i, 1)}>
                ▼
              </button>
            </div>
            <input
              className="input flex-1"
              defaultValue={c}
              onBlur={(e) => e.target.value && e.target.value !== c && hernoem(c, e.target.value)}
            />
            <div className="w-32">
              <NumberInput
                value={data.standaard_glaasgrootte_per_categorie[c] ?? 25}
                onCommit={(n) =>
                  onSave({
                    standaard_glaasgrootte_per_categorie: {
                      ...data.standaard_glaasgrootte_per_categorie,
                      [c]: n
                    }
                  })
                }
                suffix="cl"
              />
            </div>
            <button
              className="btn-danger"
              onClick={() => muteer(cats.filter((x) => x !== c))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <input
          className="input flex-1"
          placeholder="Nieuwe categorie…"
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
        />
        <button
          className="btn-outline"
          disabled={!nieuw || cats.includes(nieuw)}
          onClick={() => {
            muteer([...cats, nieuw])
            setNieuw('')
          }}
        >
          Toevoegen
        </button>
      </div>
    </Card>
  )
}
