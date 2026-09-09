export async function getCameraStream(facing: "user" | "environment") {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not expose camera access.");
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });
}

export function waitForLiveVideo(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", ready);
      video.removeEventListener("canplay", ready);
      video.removeEventListener("playing", ready);
    };

    const ready = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("The camera opened, but no video frames arrived."));
    }, 7000);

    video.addEventListener("loadedmetadata", ready);
    video.addEventListener("canplay", ready);
    video.addEventListener("playing", ready);
  });
}
