import { useEffect, useState } from "react";
import { Download, Images, Play } from "lucide-react";
import { listPhotos } from "../lib/api";
import type { PhotoItem } from "../lib/types";
import { navigate } from "../navigation";

export function AlbumPage() {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const refresh = async () => {
    try {
      const album = await listPhotos();
      setItems(album.items);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load the album.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!playing || selected === null || items.length < 2) return;
    const timer = window.setInterval(
      () => setSelected((current) => current === null ? 0 : (current + 1) % items.length),
      3500,
    );
    return () => window.clearInterval(timer);
  }, [playing, selected, items.length]);

  const current = selected === null ? null : items[selected];

  return (
    <main className="page album-page">
      <section className="hero compact-hero">
        <p className="eyebrow">The shared album</p>
        <h1>All the <em>good stuff.</em></h1>
        <p>{items.length ? `${items.length} wedding ${items.length === 1 ? "memory" : "memories"} and counting.` : "Photos will appear here as guests add them."}</p>
        {items.length > 1 && (
          <button className="secondary slideshow-button" onClick={() => { setSelected(0); setPlaying(true); }}>
            <Play size={17} fill="currentColor" /> Start slideshow
          </button>
        )}
      </section>

      {loading ? (
        <div className="empty-state">Loading the wedding album…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Images size={44} />
          <h2>Be the first one in the album</h2>
          <button className="primary" onClick={() => navigate("/")}>Take a photo</button>
        </div>
      ) : (
        <section className="photo-grid">
          {items.map((photo, index) => (
            <button className="photo-tile" key={photo.id} onClick={() => setSelected(index)}>
              <img src={photo.thumbUrl} alt={photo.guestName ? `Wedding photo from ${photo.guestName}` : "Wedding guest photo"} loading="lazy" />
              {(photo.guestName || photo.message) && (
                <span><strong>{photo.guestName}</strong>{photo.message && <small>{photo.message}</small>}</span>
              )}
            </button>
          ))}
        </section>
      )}
      {status && <p className="status-message">{status}</p>}

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => { setSelected(null); setPlaying(false); }}>
          <div className="lightbox-card" onClick={(event) => event.stopPropagation()}>
            <button className="lightbox-close" onClick={() => { setSelected(null); setPlaying(false); }}>×</button>
            <img src={current.imageUrl} alt="Full wedding photo" />
            <div className="lightbox-copy">
              <div><strong>{current.guestName || "Wedding guest"}</strong>{current.message && <p>{current.message}</p>}</div>
              <a className="secondary link-button" href={`${current.imageUrl}?download=1`}><Download size={17} /> Download</a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
