import { useEffect, useState } from "react";
import { Download, Eye, EyeOff, LogOut, Shield, Trash2 } from "lucide-react";
import {
  adminLogin,
  adminLogout,
  deletePhoto,
  getAdminSession,
  listPhotos,
  setPhotoHidden,
} from "../lib/api";
import type { PhotoItem } from "../lib/types";

export function AdminPage() {
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
      }
      setStatus("");
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

  if (!configured) {
    return (
      <main className="page">
        <div className="empty-state">
          <Shield size={44} />
          <h1>Admin password isn’t configured</h1>
          <p>Add the Cloudflare secret <code>ADMIN_PASSWORD</code>, then reload this page.</p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
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
  }

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
