const MAX_BYTES = 20 * 1024 * 1024;

function json(data, status = 200, origin = null) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (url.pathname === '/api/remove-bg') {
      const allowedOrigin = origin || url.origin;
      if (origin && origin !== url.origin) {
        return json({ error: 'Cross-origin requests are not allowed.' }, 403, url.origin);
      }

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
      }

      if (request.method !== 'POST') {
        return json({ error: 'Method Not Allowed' }, 405, allowedOrigin);
      }

      const contentType = request.headers.get('Content-Type') || '';
      const contentLength = Number(request.headers.get('Content-Length') || 0);

      if (!contentType.startsWith('image/')) {
        return json({ error: 'Please upload a valid image.' }, 400, allowedOrigin);
      }
      if (contentType.toLowerCase().includes('image/gif')) {
        return json({ error: 'Animated GIFs are not supported. Please upload JPG, PNG or WebP.' }, 415, allowedOrigin);
      }
      if (contentLength > MAX_BYTES) {
        return json({ error: 'Image is too large. Maximum size is 20 MB.' }, 413, allowedOrigin);
      }
      if (!request.body) {
        return json({ error: 'Image body is missing.' }, 400, allowedOrigin);
      }
      if (!env.IMAGES) {
        console.error('[BGErase] Missing IMAGES binding.');
        return json({ error: 'Background-removal service is not configured.' }, 500, allowedOrigin);
      }

      try {
        const result = (
          await env.IMAGES
            .input(request.body)
            .transform({ segment: 'foreground' })
            .output({ format: 'image/png' })
        ).response();

        const headers = new Headers(result.headers);
        headers.set('Content-Type', 'image/png');
        headers.set('Cache-Control', 'no-store');
        headers.set('Content-Disposition', 'inline; filename="bgerase-transparent.png"');
        Object.entries(corsHeaders(allowedOrigin)).forEach(([key, value]) => headers.set(key, value));

        return new Response(result.body, { status: result.status, headers });
      } catch (error) {
        console.error('[BGErase] Images transformation error:', error);
        return json({
          error: 'Background removal failed.',
          detail: String(error?.message || error)
        }, 502, allowedOrigin);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
