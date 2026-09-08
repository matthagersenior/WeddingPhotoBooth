import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  Download,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Heart,
  ImagePlus,
  Images,
  LogOut,
  Play,
  QrCode,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import {
  adminLogin,
  adminLogout,
  deletePhoto,
  getAdminSession,
  listPhotos,
  setPhotoHidden,
  uploadPhoto,
} from "./lib/api";
import { captureFile, captureVideoFrame, type CapturedPhoto } from "./lib/capture";
import type { PhotoItem } from "./lib/types";

const FILTERS = [
  { id: "natural", label: "Natural", css: "none" },
  { id: "warm", label: "Warm", css: "sepia(.22) saturate(1.16) contrast(1.02)" },
  { id: "cool", label: "Cool", css: "saturate(.92) hue-rotate(8deg) contrast(1.04)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.08)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.35) contrast(1.06)" },
] as const;

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => navigate("/")} aria-label="Wedding photo booth home">
          <span className="brand-mark"><Heart size={17} fill="currentColor" /></span>
          <span><strong>Ever After</strong><small>Wedding Photo Booth</small></span>
        </button>
        <nav aria-label="Main navigation">
          <button onClick={() => navigate("/")}><Camera size={17} /> Booth</button>
          <button onClick={() => navigate("/album")}><Images size={17} /> Album</button>
          <button onClick={() => navigate("/share")}><QrCode size={17} /> QR</button>
        </nav>
      </header>
      {children}
      <footer>Made for one unforgettable night · Photos stay in the wedding album.</footer>
    </div>
  );
}

function Booth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraOn, setCameraOn] = useState(false);
  const [filterId, setFilterId] = useState("natural");
  const [capture, setCapture] = useState<CapturedPhoto | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const filterCss = FILTERS.find((filter) => filter.id === filterId)?.css ?? "none";

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async (nextFacing = facing) => {
    setStatus("");
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setStatus("Camera access was unavailable. You can still choose a photo from your phone.");
    }
  };

  useEffect(() => () => stopCamera(), []);
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOn]);

  const flipCamera = async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await startCamera(next);
  };

  const takePhoto = async () => {
    if (!videoRef.current || !cameraOn || busy) return;
    setBusy(true);
    setStatus("");
    try {
      for (const number of [3, 2, 1]) {
        setCountdown(number);
        await new Promise((resolve) => setTimeout(resolve, 650));
      }
      setCountdown(null);
      const next = await captureVideoFrame(videoRef.current, filterId);
      setCapture(next);
      stopCamera();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not take the photo.");
    } finally {
      setCountdown(null);
      setBusy(false);
    }
  };

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      const next = await captureFile(file, filterId);
      setCapture(next);
      stopCamera();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read that photo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const retake = () => {
    if (capture) URL.revokeObjectURL(capture.previewUrl);
    setCapture(null);
    setStatus("");
  };

  const keepPhoto = async () => {
    if (!capture || busy) return;
    setBusy(true);
    setStatus("Adding your photo to the wedding album…");
    try {
      await uploadPhoto(capture, { filterId, guestName, message });
      URL.revokeObjectURL(capture.previewUrl);
      setCapture(null);
      navigate("/album");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page booth-page">
      <section className="hero compact-hero">
        <p className="eyebrow">Strike a pose</p>
        <h1>Capture a little <em>magic.</em></h1>
        <p>Take a photo here or choose one from your phone. No account required.</p>
      </section>

      <section className="booth-card">
        <div className="camera-stage">
          {capture ? (
            <img className="review-image" src={capture.previewUrl} alt="Your wedding photo preview" />
          ) : (
            <>
              <video ref={videoRef} playsInline muted className={cameraOn ? "camera-video active" : "camera-video"} style={{ filter: filterCss }} />
              {!cameraOn && (
                <div className="camera-empty">
                  <Camera size={48} />
                  <h2>Ready when you are</h2>
                  <p>Start the camera or choose a photo already on your phone.</p>
                  <div className="inline-actions">
                    <button className="primary" onClick={() => startCamera()}><Camera size={18} /> Start camera</button>
                    <button className="secondary" onClick={() => fileRef.current?.click()}><ImagePlus size={18} /> Choose photo</button>
                  </div>
                </div>
              )}
              {countdown && <div className="countdown">{countdown}</div>}
            </>
          )}
        </div>

        {!capture && (
          <>
            <div className="filter-rail" aria-label="Photo filters">
              {FILTERS.map((filter) => (
                <button key={filter.id} className={filter.id === filterId ? "selected" : ""} onClick={() => setFilterId(filter.id)}>{filter.label}</button>
              ))}
            </div>
            {cameraOn && (
              <div className="shutter-row">
                <button className="icon-button" onClick={flipCamera} aria-label="Flip camera"><FlipHorizontal2 /></button>
                <button className="shutter" onClick={takePhoto} disabled={busy} aria-label="Take photo"><span /></button>
                <button className="icon-button" onClick={() => fileRef.current?.click()} aria-label="Choose a photo"><ImagePlus /></button>
              </div>
            )}
          </>
        )}

        {capture && (
          <div className="review-panel">
            <div className="field-row">
              <label>Your name <span>optional</span><input value={guestName} maxLength={80} onChange={(event) => setGuestName(event.target.value)} placeholder="Who’s in this one?" /></label>
              <label>Message <span>optional</span><input value={message} maxLength={220} onChange={(event) => setMessage(event.target.value)} placeholder="A note for the happy couple" /></label>
            </div>
            <div className="review-actions">
              <button className="secondary" onClick={retake} disabled={busy}><RefreshCw size={18} /> Retake</button>
              <button className="primary" onClick={keepPhoto} disabled={busy}><Heart size={18} fill="currentColor" /> Keep this photo</button>
            </div>
          </div>
        )}

        <input ref={fileRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => choosePhoto(event.target.files?.[0])} />
        {status && <p className="status-message">{status}</p>}
      </section>

      <button className="album-cta" onClick={() => navigate("/album")}><Images size={19} /> See everyone’s photos</button>
    </main>
  );
}

function Album() {
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
    const timer = window.setInterval(() => setSelected((current) => current === null ? 0 : (current + 1) % items.length), 3500);
    return () => window.clearInterval(timer);
  }, [playing, selected, items.length]);

  const current = selected === null ? null : items[selected];

  return (
    <main className="page album-page">
      <section className="hero compact-hero">
        <p className="eyebrow">The shared album</p>
        <h1>All the <em>good stuff.</em></h1>
        <p>{items.length ? `${items.length} wedding ${items.length === 1 ? "memory" : "memories"} and counting.` : "Photos will appear here as guests add them."}</p>
        {items.length > 1 && <button className="secondary slideshow-button" onClick={() => { setSelected(0); setPlaying(true); }}><Play size={17} fill="currentColor" /> Start slideshow</button>}
      </section>

      {loading ? <div className="empty-state">Loading the wedding album…</div> : items.length === 0 ? (
        <div className="empty-state"><Images size={44} /><h2>Be the first one in the album</h2><button className="primary" onClick={() => navigate("/")}>Take a photo</button></div>
      ) : (
        <section className="photo-grid">
          {items.map((photo, index) => (
            <button className="photo-tile" key={photo.id} onClick={() => setSelected(index)}>
              <img src={photo.thumbUrl} alt={photo.guestName ? `Wedding photo from ${photo.guestName}` : "Wedding guest photo"} loading="lazy" />
              {(photo.guestName || photo.message) && <span><strong>{photo.guestName}</strong>{photo.message && <small>{photo.message}</small>}</span>}
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

function Share() {
  const [qr, setQr] = useState("");
  const weddingUrl = useMemo(() => window.location.origin, []);

  useEffect(() => {
    QRCode.toDataURL(weddingUrl, { width: 900, margin: 2, errorCorrectionLevel: "H" }).then(setQr).catch(() => setQr(""));
  }, [weddingUrl]);

  return (
    <main className="page share-page">
      <section className="share-card">
        <p className="eyebrow">Scan · Snap · Share</p>
        <h1>Join the wedding album</h1>
        <p>Point your phone camera at the QR code. No app and no account needed.</p>
        {qr ? <img className="qr-image" src={qr} alt={`QR code for ${weddingUrl}`} /> : <div className="qr-placeholder">Generating QR…</div>}
        <strong className="share-url">{weddingUrl.replace(/^https?:\/\//, "")}</strong>
        <div className="share-actions">
          <button className="primary" onClick={() => navigate("/")}><Camera size={18} /> Open photo booth</button>
          {qr && <a className="secondary link-button" href={qr} download="wedding-photo-booth-qr.png"><Download size={18} /> Save QR</a>}
        </div>
        <p className="print-note">Tip: save this QR and print it on table cards, signs, or your welcome board.</p>
      </section>
    </main>
  );
}

function Admin() {
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [busyId, setBusyId] = useState("");
  const [status, setStatus] = useState("Checking admin access…");

  const load = async () => {
    try {
      const session = await getAdminSession();
      setConfigured(session.configured);
      setAuthenticated(session.authenticated);
      if (session.authenticated) {
        const album = await listPhotos(true);
        setItems(album.items);
        setStatus("");
      } else {
        setStatus("");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not check admin access.");
    }
  };

  useEffect(() => { void load(); }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("Signing in…");
    try {
      await adminLogin(password);
      setPassword("");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign in failed.");
    }
  };

  const toggle = async (photo: PhotoItem) => {
    setBusyId(photo.id);
    try {
      await setPhotoHidden(photo.id, !photo.hidden);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update that photo.");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (photo: PhotoItem) => {
    if (!window.confirm("Permanently delete this photo from the wedding album?")) return;
    setBusyId(photo.id);
    try {
      await deletePhoto(photo.id);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete that photo.");
    } finally {
      setBusyId("");
    }
  };

  if (!configured) return <main className="page"><div className="empty-state"><Shield size={44} /><h1>Admin password isn’t configured</h1><p>Add the Cloudflare secret <code>ADMIN_PASSWORD</code>, then reload this page.</p></div></main>;

  if (!authenticated) return (
    <main className="page admin-login-page">
      <form className="admin-login" onSubmit={login}>
        <Shield size={38} />
        <p className="eyebrow">Couple controls</p>
        <h1>Private album admin</h1>
        <p>Use the password stored privately in Cloudflare.</p>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button className="primary" type="submit">Open admin</button>
        {status && <p className="status-message">{status}</p>}
      </form>
    </main>
  );

  return (
    <main className="page admin-page">
      <section className="admin-heading">
        <div><p className="eyebrow">Couple controls</p><h1>Wedding album admin</h1><p>{items.length} uploaded photos, including hidden photos.</p></div>
        <button className="secondary" onClick={async () => { await adminLogout(); setAuthenticated(false); setItems([]); }}><LogOut size={17} /> Sign out</button>
      </section>
      {status && <p className="status-message">{status}</p>}
      <section className="admin-grid">
        {items.map((photo) => (
          <article className={photo.hidden ? "admin-photo hidden-photo" : "admin-photo"} key={photo.id}>
            <img src={photo.thumbUrl} alt="Wedding upload" />
            <div className="admin-photo-copy"><strong>{photo.guestName || "Guest"}</strong><small>{photo.message || "No message"}</small></div>
            <div className="admin-actions">
              <button onClick={() => toggle(photo)} disabled={busyId === photo.id}>{photo.hidden ? <Eye size={17} /> : <EyeOff size={17} />}{photo.hidden ? "Show" : "Hide"}</button>
              <a href={`${photo.imageUrl}?download=1`}><Download size={17} /> Save</a>
              <button className="danger" onClick={() => remove(photo)} disabled={busyId === photo.id}><Trash2 size={17} /> Delete</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  let content: React.ReactNode;
  if (path === "/album") content = <Album />;
  else if (path === "/share") content = <Share />;
  else if (path === "/admin") content = <Admin />;
  else content = <Booth />;

  return <Shell>{content}</Shell>;
}
