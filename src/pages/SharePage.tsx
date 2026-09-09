import { useEffect, useMemo, useState } from "react";
import { Camera, Download } from "lucide-react";
import { navigate } from "../navigation";
import { makeWeddingQr } from "../qr";

export function SharePage() {
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");
  const weddingUrl = useMemo(() => window.location.origin, []);

  useEffect(() => {
    let cancelled = false;
    void makeWeddingQr(weddingUrl)
      .then((value) => {
        if (!cancelled) {
          setQr(value);
          setStatus("");
        }
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Could not generate the QR code.");
      });
    return () => { cancelled = true; };
  }, [weddingUrl]);

  return (
    <main className="page share-page">
      <section className="share-card">
        <p className="eyebrow">Scan · Snap · Share</p>
        <h1>Join the wedding album</h1>
        <p>Point your phone camera at the QR code. The couple’s photo is right in the center.</p>
        {qr ? (
          <img className="qr-image" src={qr} alt={`QR code for ${weddingUrl} with the couple's photo in the center`} />
        ) : (
          <div className="qr-placeholder">Generating QR…</div>
        )}
        <strong className="share-url">{weddingUrl.replace(/^https?:\/\//, "")}</strong>
        <div className="share-actions">
          <button className="primary" onClick={() => navigate("/")}><Camera size={18} /> Open photo booth</button>
          {qr && <a className="secondary link-button" href={qr} download="wedding-photo-booth-qr.png"><Download size={18} /> Save QR</a>}
        </div>
        {status && <p className="status-message">{status}</p>}
        <p className="print-note">Tip: save this QR and print it on table cards, signs, or your welcome board.</p>
      </section>
    </main>
  );
}
