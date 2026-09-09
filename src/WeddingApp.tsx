import { useEffect, useState } from "react";
import { Camera, Heart, Images, QrCode } from "lucide-react";
import { navigate } from "./navigation";
import { AdminPage } from "./pages/AdminPage";
import { AlbumPage } from "./pages/AlbumPage";
import { BoothPage } from "./pages/BoothPage";
import { SharePage } from "./pages/SharePage";

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

export default function WeddingApp() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  let content: React.ReactNode;
  if (path === "/album") content = <AlbumPage />;
  else if (path === "/share") content = <SharePage />;
  else if (path === "/admin") content = <AdminPage />;
  else content = <BoothPage />;

  return <Shell>{content}</Shell>;
}
