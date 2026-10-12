# Mahamaya AI — Shared Crowd Tracker + Gallery

## What changed
- Crowd reports now use `POST /api/crowd` and `GET /api/crowd` on the same Node.js server as the gallery.
- Crowd reports are stored in `data/crowd.json`.
- Gallery uploads continue to be stored in `data/uploads/` and `data/gallery.json`, and remain hidden until admin approval.
- `crowd-config.js` selects `backend: 'server'`; there is no local-demo fallback.

## Deploy
1. Deploy this entire folder as one Node.js web service (Node.js 18+).
2. Set environment variables:
   - `ADMIN_PASSWORD`: strong password, at least 10 characters
   - `NODE_ENV=production`
   - `DATA_DIR=/var/data` (use the actual mount path of your persistent disk)
   - `TRUST_PROXY=1` when running behind Render/Railway/Nginx proxy
3. Attach a persistent disk/volume to the service at the `DATA_DIR` path.
4. Start command: `node server.js`.
5. Open the deployed site's `/admin`, log in, and approve submitted photos.

## Important
- Everyone must use the same deployed website/backend URL. Do not host the HTML on GitHub Pages while using a different, unconfigured API.
- A persistent disk is required on hosts where the app filesystem is temporary. Without it, gallery photos and crowd reports may disappear on redeploy/restart.
- Crowd reports are anonymous, shared across visitors, expire from the active display window after 2 hours, and are pruned from storage after 24 hours.
- Photo uploads are shared after admin approval only.
