# WeddingPhotoBooth

A mobile-first wedding photo booth built for Cloudflare Workers.

## Guest experience

- No account required
- Take a photo with the phone camera or choose one from the device
- Countdown, camera flip, filters, retake and review flow
- Optional guest name and message
- Shared wedding album with lightbox, downloads and slideshow
- `/share` generates a downloadable QR code for the live wedding URL

## Couple/admin experience

Open `/admin` and use the password stored as the Cloudflare Worker secret `ADMIN_PASSWORD`.

Admin can:

- View every completed upload, including hidden photos
- Hide/show photos
- Download originals
- Permanently delete photos

## Cloudflare architecture

- Worker: `wedding-photo-booth`
- D1 binding: `DB`
- D1 database: `wedding-photo-booth-db`
- R2 binding: `PHOTOS`
- R2 bucket: `wedding-photo-booth-photos`
- Secret: `ADMIN_PASSWORD`

D1 stores metadata only. R2 stores photo files and thumbnails.

## Build

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Cloudflare Workers Builds

Use:

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/` (or blank)

The repository's `wrangler.jsonc` contains the D1 and R2 bindings. Do not commit `ADMIN_PASSWORD` or API credentials.
