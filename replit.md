# LegalLens

Mobile-first Next.js prototype for reviewing food package labels, pricing, nutrition, and sugar ingredients.

## Run

- Development: `npm run dev`
- Production build: `npm run build`
- The Replit workflow runs the app on `0.0.0.0:5000`.

## Configuration

Add `GEMINI_API_KEY` as a Replit Secret to enable live package scans. The key is read only by `app/api/analyze/route.ts` and is never sent to the browser.

The **Try a Sample Scan** flow is static and works without a key or network connection.