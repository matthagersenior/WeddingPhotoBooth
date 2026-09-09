import QRCode from "qrcode";
import { couplePhoto6 } from "./couplePhotos";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the couple photo for the QR code."));
    image.src = src;
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.arcTo(x + width, y, x + width, y + r, r);
  context.lineTo(x + width, y + height - r);
  context.arcTo(x + width, y + height, x + width - r, y + height, r);
  context.lineTo(x + r, y + height);
  context.arcTo(x, y + height, x, y + height - r, r);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + r, y, r);
  context.closePath();
}

export async function makeWeddingQr(url: string): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, {
    width: 900,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#3d2a2f", light: "#fffaf7" },
  });

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the QR code.");

  const image = await loadImage(couplePhoto6);
  const photoSize = Math.round(canvas.width * 0.18);
  const border = Math.round(photoSize * 0.1);
  const x = Math.round((canvas.width - photoSize) / 2);
  const y = Math.round((canvas.height - photoSize) / 2);
  const radius = Math.round(photoSize * 0.16);

  context.fillStyle = "#fffaf7";
  roundedRect(context, x - border, y - border, photoSize + border * 2, photoSize + border * 2, radius + border);
  context.fill();

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  const aspect = image.naturalWidth / image.naturalHeight;
  if (aspect > 1) {
    sourceWidth = image.naturalHeight;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.save();
  roundedRect(context, x, y, photoSize, photoSize, radius);
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, photoSize, photoSize);
  context.restore();

  return canvas.toDataURL("image/png");
}
