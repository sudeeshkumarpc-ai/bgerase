BGErase – production static website package

WHAT IS FIXED
- Replaced the old IS-Net-only remover with a browser-based BiRefNet pipeline.
- Uses the 1024 WebGPU BiRefNet quality model when the browser can run it, with automatic fallback to the browser-ready 512 model.
- Uses a 512 model on browsers without WebGPU, with a WASM fallback path.
- Keeps the source image in the browser; there is no BGErase inference server or API key.
- Creates a real RGBA transparent PNG, not a white/black replacement background.
- Adds an on-device Restore/Erase brush so a user can correct a missed shirt, jacket, hair, etc. instead of accepting a bad cutout.
- Adds Undo and Reset for the editor.
- Uses a checkerboard transparency preview.
- Accepts common browser-decodable image formats and validates a 25 MB maximum.
- Keeps truthful processing progress rather than a fake timer.
- Fixed robots.txt so CSS/JS/assets are crawlable.
- Canonical, sitemap and robots use the {{SITE_URL}} placeholder and must be replaced with the final public HTTPS origin before deployment/GSC submission.
- Preserved the existing BGErase design and girl before/after demo assets.

IMPORTANT MODEL NOTE
The browser downloads the selected BiRefNet model from Hugging Face on first use and the browser may cache it. The image itself is processed locally in the browser. Model weights used here are from the BiRefNet browser-ready repositories and are marked MIT by their model cards; review the current model-card licensing/training-data notes before commercial monetization.

DEPLOY
Upload the complete folder contents to the same static/Cloudflare Worker site. Do not upload only index.html; keep assets/, tools/, legal pages, robots.txt, sitemap.xml, favicon.svg, site.webmanifest and _headers together.

SITE URL
Replace every {{SITE_URL}} in canonical tags, sitemap.xml and robots.txt with the exact public HTTPS origin. Do not invent a domain.
