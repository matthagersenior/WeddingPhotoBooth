export type CapturedPhoto = {
  imageBlob: Blob;
  thumbBlob: Blob;
  previewUrl: string;
};

const FILTERS: Record<string, string> = {
  natural: "none",
  warm: "sepia(0.22) saturate(1.16) contrast(1.02)",
  cool: "saturate(0.92) hue-rotate(8deg) contrast(1.04)",
  mono: "grayscale(1) contrast(1.08)",
  vivid: "saturate(1.35) contrast(1.06)",
};

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the photo."))),
      "image/jpeg",
      quality,
    );
  });
}

function scaledSize(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function imageFromBlob(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

async function renderCapture(source: CanvasImageSource, width: number, height: number, filterId: string) {
  const large = scaledSize(width, height, 1800);
  const canvas = document.createElement("canvas");
  canvas.width = large.width;
  canvas.height = large.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot process photos.");
  context.filter = FILTERS[filterId] ?? FILTERS.natural;
  context.drawImage(source, 0, 0, large.width, large.height);

  const imageBlob = await canvasBlob(canvas, 0.88);

  const small = scaledSize(large.width, large.height, 520);
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = small.width;
  thumbCanvas.height = small.height;
  const thumbContext = thumbCanvas.getContext("2d");
  if (!thumbContext) throw new Error("This browser cannot create thumbnails.");
  thumbContext.drawImage(canvas, 0, 0, small.width, small.height);
  const thumbBlob = await canvasBlob(thumbCanvas, 0.78);

  return {
    imageBlob,
    thumbBlob,
    previewUrl: URL.createObjectURL(imageBlob),
  } satisfies CapturedPhoto;
}

export async function captureVideoFrame(video: HTMLVideoElement, filterId: string) {
  if (!video.videoWidth || !video.videoHeight) throw new Error("Camera is not ready yet.");
  return renderCapture(video, video.videoWidth, video.videoHeight, filterId);
}

export async function captureFile(file: File, filterId: string) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo file.");
  const bitmap = await imageFromBlob(file);
  try {
    return await renderCapture(bitmap, bitmap.width, bitmap.height, filterId);
  } finally {
    bitmap.close();
  }
}
