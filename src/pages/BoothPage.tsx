import { useEffect, useRef, useState } from "react";
import { Camera, FlipHorizontal2, Heart, ImagePlus, Images, RefreshCw } from "lucide-react";
import { getCameraStream, waitForLiveVideo } from "../camera";
import { COUPLE_PHOTOS } from "../couplePhotos";
import { uploadPhoto } from "../lib/api";
import { captureFile, captureVideoFrame, type CapturedPhoto } from "../lib/capture";
import { navigate } from "../navigation";

const FILTERS = [
  { id: "natural", label: "Natural", css: "none" },
  { id: "warm", label: "Warm", css: "sepia(.22) saturate(1.16) contrast(1.02)" },
  { id: "cool", label: "Cool", css: "saturate(.92) hue-rotate(8deg) contrast(1.04)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.08)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.35) contrast(1.06)" },
] as const;

type FilePickerHandle = { getFile(): Promise<File> };
type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<FilePickerHandle[]>;
};

function CouplePhotoStrip() {
  return (
    <section aria-label="Photos of the happy couple" style={{ maxWidth: 980, margin: "0 auto 28px" }}>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "2px 2px 9px", scrollSnapType: "x mandatory" }}>
        {COUPLE_PHOTOS.map((photo, index) => (
          <img
            key={photo}
            src={photo}
            alt={`Favorite photo of the happy couple ${index + 1}`}
            loading={index < 2 ? "eager" : "lazy"}
            style={{
              width: "clamp(140px, 22vw, 190px)",
              aspectRatio: "4 / 5",
              objectFit: "cover",
              borderRadius: 18,
              flex: "0 0 auto",
              scrollSnapAlign: "start",
              boxShadow: "0 10px 26px rgba(77, 52, 58, .12)",
            }}
          />
        ))}
      </div>
      <p style={{ textAlign: "center", color: "#8a7075", margin: "8px 0 0", fontSize: ".86rem" }}>
        A few favorites from the happy couple — now add yours to the wedding story.
      </p>
    </section>
  );
}

export function BoothPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
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
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setCameraStarting(false);
  };

  const startCamera = async (nextFacing = facing) => {
    setStatus("Starting camera…");
    stopCamera();
    setCameraStarting(true);
    try {
      const stream = await getCameraStream(nextFacing);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is not available.");
      video.srcObject = stream;
      await video.play();
      await waitForLiveVideo(video);
      setCameraOn(true);
      setCameraStarting(false);
      setStatus("");
    } catch (error) {
      stopCamera();
      const detail = error instanceof Error ? error.message : "Camera access was unavailable.";
      setStatus(`${detail} You can still choose a photo from your phone.`);
    }
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

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

  const openPhotoPicker = async () => {
    const picker = (window as FilePickerWindow).showOpenFilePicker;
    if (picker) {
      try {
        const [handle] = await picker({
          multiple: false,
          types: [{
            description: "Photos",
            accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] },
          }],
        });
        if (handle) await choosePhoto(await handle.getFile());
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    fileRef.current?.click();
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

      <CouplePhotoStrip />

      <section className="booth-card">
        <div className="camera-stage">
          {capture ? (
            <img className="review-image" src={capture.previewUrl} alt="Your wedding photo preview" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cameraOn ? "camera-video active" : "camera-video"}
                style={{ filter: filterCss, transform: facing === "user" ? "scaleX(-1)" : "none" }}
              />
              {!cameraOn && (
                <div className="camera-empty">
                  <Camera size={48} />
                  <h2>{cameraStarting ? "Starting camera…" : "Ready when you are"}</h2>
                  <p>{cameraStarting ? "Waiting for a live video frame." : "Start the camera or choose a photo already on your phone."}</p>
                  <div className="inline-actions">
                    <button className="primary" onClick={() => startCamera()} disabled={cameraStarting}><Camera size={18} /> {cameraStarting ? "Starting…" : "Start camera"}</button>
                    <button className="secondary" onClick={openPhotoPicker} disabled={cameraStarting}><ImagePlus size={18} /> Choose from photos</button>
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
                <button className="icon-button" onClick={openPhotoPicker} aria-label="Choose a photo"><ImagePlus /></button>
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

        <input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])} />
        {status && <p className="status-message">{status}</p>}
      </section>

      <button className="album-cta" onClick={() => navigate("/album")}><Images size={19} /> See everyone’s photos</button>
    </main>
  );
}
