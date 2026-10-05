BGErase server-side background removal

This build keeps the existing BGErase UI and replaces browser-side ONNX inference with Cloudflare Images foreground segmentation.

Requirements
- Cloudflare Workers
- Cloudflare Images Transformations enabled on the account/zone
- Images binding named IMAGES

Deploy
1. Upload/deploy this project as a Worker using worker.js and wrangler.toml (or deploy with Wrangler).
2. Confirm the Worker has an Images binding named IMAGES.
3. The Worker serves the static files from this same project and handles POST /api/remove-bg.
4. Open the BGErase Worker URL and upload a JPG/PNG/WebP under 20 MB.

Important
- The image is sent to Cloudflare Images for foreground segmentation. It is not processed solely on the phone anymore.
- Cloudflare Images Free currently includes up to 5,000 unique image transformations per month; exceeding the free limit returns an error rather than charging automatically.
- The current website UI/design is preserved.
