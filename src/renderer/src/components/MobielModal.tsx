import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { Modal } from './ui'

// Shows how to open Tapwijs on a phone on the same Wi-Fi: a LAN address + QR
// code. What the phone fills in lands in the same database on this PC.
export function MobielModal({
  pad,
  onClose
}: {
  /** Hash route to deep-link to, e.g. "/feesten/12". */
  pad: string
  onClose: () => void
}): JSX.Element {
  const [urls, setUrls] = useState<string[]>([])
  const [actief, setActief] = useState(true)
  const [qr, setQr] = useState<string>('')

  useEffect(() => {
    api.net.info().then((i) => {
      setActief(i.actief)
      setUrls(i.urls)
    })
  }, [])

  const volledig = urls[0] ? `${urls[0]}/#${pad}` : ''

  useEffect(() => {
    if (!volledig) return setQr('')
    QRCode.toDataURL(volledig, { margin: 1, width: 320 }).then(setQr).catch(() => setQr(''))
  }, [volledig])

  return (
    <Modal open title="Op je gsm invullen" onClose={onClose}>
      {!actief || urls.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Geen lokaal netwerkadres gevonden. Zorg dat de computer met wifi (of kabel) verbonden is.
          Op je gsm moet je op <strong>hetzelfde wifi-netwerk</strong> zitten.
        </p>
      ) : (
        <div className="text-center">
          <p className="text-sm text-ink-soft mb-4">
            Scan met de camera van je gsm. Je moet op <strong>hetzelfde wifi-netwerk</strong> zitten
            als deze computer. Wat je invult, komt meteen in de app op de pc.
          </p>
          {qr && (
            <img
              src={qr}
              alt="QR-code"
              className="mx-auto rounded-xl border border-cream-deep p-2 bg-white"
              width={220}
              height={220}
            />
          )}
          <div className="mt-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-ink-faint mb-1">
              Of typ dit adres in je browser
            </div>
            {urls.map((u) => (
              <div key={u} className="tabular text-ink">
                {u}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint mt-4">
            Tip: dit werkt op je eigen netwerk, zonder internet. Iedereen op dat netwerk kan de app
            openen.
          </p>
        </div>
      )}
      <div className="flex justify-end mt-6">
        <button className="btn-primary" onClick={onClose}>
          Sluiten
        </button>
      </div>
    </Modal>
  )
}
