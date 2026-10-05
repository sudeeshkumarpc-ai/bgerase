const input = document.querySelector('#file');
const choose = document.querySelector('#choose');
const drop = document.querySelector('#dropzone');
const original = document.querySelector('#orig');
const resultCanvas = document.querySelector('#resultCanvas');
const resultEmpty = document.querySelector('#resultEmpty');
const download = document.querySelector('#download');
const editBtn = document.querySelector('#editBtn');
const editor = document.querySelector('#editor');
const toolStatus = document.querySelector('#status');
const bar = document.querySelector('#progressBar');
const percent = document.querySelector('#percent');
const brushSize = document.querySelector('#brushSize');
const brushSizeValue = document.querySelector('#brushSizeValue');
const restoreBtn = document.querySelector('#restoreBtn');
const eraseBtn = document.querySelector('#eraseBtn');
const undoBtn = document.querySelector('#undoBtn');
const resetBtn = document.querySelector('#resetBtn');
const applyBtn = document.querySelector('#applyBtn');
const editorHint = document.querySelector('#editorHint');

let processing = false;
let originalUrl = null;
let originalImage = null;
let automaticImageData = null;
let history = [];
let brushMode = 'restore';
let pointerDown = false;
let lastPoint = null;

function setProgress(value, message) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  if (bar) bar.style.width = `${p}%`;
  if (percent) percent.textContent = `${Math.round(p)}%`;
  if (toolStatus) toolStatus.textContent = message || '';
}

function setProcessingState(value) {
  processing = value;
  if (choose) choose.disabled = value;
  if (input) input.disabled = value;
  if (editBtn) editBtn.disabled = value || !automaticImageData;
}

function revokeOriginal() {
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalUrl = null;
}

function pick() {
  if (!processing) input?.click();
}

choose?.addEventListener('click', pick);
drop?.addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  pick();
});

['dragenter', 'dragover'].forEach((eventName) => drop?.addEventListener(eventName, (e) => {
  e.preventDefault();
  drop.classList.add('drag');
}));
['dragleave', 'drop'].forEach((eventName) => drop?.addEventListener(eventName, (e) => {
  e.preventDefault();
  drop.classList.remove('drag');
}));

drop?.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) processImage(file);
});
input?.addEventListener('change', () => {
  const file = input.files?.[0];
  if (file) processImage(file);
  input.value = '';
});

window.addEventListener('paste', (e) => {
  const file = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
  if (file) processImage(file);
});

brushSize?.addEventListener('input', () => {
  if (brushSizeValue) brushSizeValue.textContent = `${brushSize.value}px`;
});
restoreBtn?.addEventListener('click', () => setBrushMode('restore'));
eraseBtn?.addEventListener('click', () => setBrushMode('erase'));
undoBtn?.addEventListener('click', undoEdit);
resetBtn?.addEventListener('click', resetEdit);
applyBtn?.addEventListener('click', () => {
  editor?.classList.remove('open');
  setProgress(100, 'Your edited transparent PNG is ready.');
});
editBtn?.addEventListener('click', () => {
  if (!automaticImageData) return;
  editor?.classList.toggle('open');
  if (editor?.classList.contains('open')) {
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

resultCanvas?.addEventListener('pointerdown', (e) => {
  if (!automaticImageData || processing) return;
  pointerDown = true;
  resultCanvas.setPointerCapture?.(e.pointerId);
  saveHistory();
  lastPoint = getCanvasPoint(e);
  paintAt(lastPoint.x, lastPoint.y);
});
resultCanvas?.addEventListener('pointermove', (e) => {
  if (!pointerDown) return;
  const point = getCanvasPoint(e);
  if (lastPoint) drawLine(lastPoint, point);
  lastPoint = point;
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => resultCanvas?.addEventListener(name, () => {
  pointerDown = false;
  lastPoint = null;
}));

function setBrushMode(mode) {
  brushMode = mode;
  restoreBtn?.classList.toggle('active', mode === 'restore');
  eraseBtn?.classList.toggle('active', mode === 'erase');
  if (editorHint) editorHint.textContent = mode === 'restore'
    ? 'Restore missing clothing, hair or other subject areas with the brush.'
    : 'Erase unwanted background or leftover pixels with the brush.';
}

function getCanvasPoint(event) {
  const rect = resultCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (resultCanvas.width / rect.width),
    y: (event.clientY - rect.top) * (resultCanvas.height / rect.height)
  };
}

function saveHistory() {
  if (!resultCanvas) return;
  const ctx = resultCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  history.push(ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height));
  if (history.length > 12) history.shift();
  if (undoBtn) undoBtn.disabled = false;
}

function undoEdit() {
  const imageData = history.pop();
  if (!imageData || !resultCanvas) return;
  const ctx = resultCanvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  if (undoBtn) undoBtn.disabled = history.length === 0;
}

function resetEdit() {
  if (!automaticImageData || !resultCanvas) return;
  const ctx = resultCanvas.getContext('2d');
  ctx.putImageData(automaticImageData, 0, 0);
  history = [];
  if (undoBtn) undoBtn.disabled = true;
}

function paintAt(x, y) {
  if (!resultCanvas) return;
  const ctx = resultCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const radius = Math.max(2, Number(brushSize?.value || 60) / 2);
  const left = Math.max(0, Math.floor(x - radius));
  const top = Math.max(0, Math.floor(y - radius));
  const right = Math.min(resultCanvas.width, Math.ceil(x + radius));
  const bottom = Math.min(resultCanvas.height, Math.ceil(y + radius));
  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) return;

  const data = ctx.getImageData(left, top, w, h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const dx = (left + px) - x;
      const dy = (top + py) - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > radius) continue;
      const edge = Math.max(0, Math.min(1, 1 - distance / radius));
      const alphaIndex = (py * w + px) * 4 + 3;
      const oldAlpha = data.data[alphaIndex];
      const strength = Math.min(1, 0.55 + edge * 0.45);
      data.data[alphaIndex] = brushMode === 'restore'
        ? Math.max(oldAlpha, Math.round(255 * strength))
        : Math.min(oldAlpha, Math.round(255 * (1 - strength)));
    }
  }
  ctx.putImageData(data, left, top);
}

function drawLine(a, b) {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const step = Math.max(2, Number(brushSize?.value || 60) / 6);
  const count = Math.ceil(distance / step);
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    paintAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}

async function getImageBitmap(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function normalize(file) {
  const bitmap = await getImageBitmap(file);
  const max = 2048;
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return { blob: await new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Image conversion failed')), 'image/png')), width: canvas.width, height: canvas.height };
}

async function removeBackground(blob) {
  const apiUrl = '/api/remove-bg';
  setProgress(15, 'Uploading image securely…');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'image/png'
    },
    body: blob
  });

  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data?.detail || data?.error || '';
    } catch (_) {}
    throw new Error(detail || `Background removal failed (${response.status})`);
  }

  const resultBlob = await response.blob();
  if (!resultBlob.type.includes('png') && !resultBlob.type.includes('image/')) {
    throw new Error('The background-removal server returned an invalid image.');
  }
  return resultBlob;
}

async function blobToImageData(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close?.();
    throw new Error('Could not prepare the transparent result.');
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

download?.addEventListener('click', async () => {
  if (!resultCanvas || !automaticImageData) return;
  const blob = await new Promise((resolve) => resultCanvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bgerase-transparent.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});


async function processImage(file) {
  if (processing) return;

  try {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      throw new Error('Please choose a JPG, PNG, WebP or other supported image.');
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error('Image is too large. Please choose an image up to 20 MB.');
    }

    setProcessingState(true);
    setProgress(5, 'Preparing your image…');

    revokeOriginal();
    automaticImageData = null;
    history = [];
    if (undoBtn) undoBtn.disabled = true;
    if (download) download.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (resultCanvas) {
      resultCanvas.hidden = true;
      resultCanvas.width = 1;
      resultCanvas.height = 1;
    }
    if (resultEmpty) resultEmpty.hidden = false;

    // Show the selected original immediately so the user gets
    // instant visual feedback that the upload worked.
    originalUrl = URL.createObjectURL(file);
    if (original) {
      original.src = originalUrl;
      original.hidden = false;
    }

    const normalized = await normalize(file);
    setProgress(12, 'Image ready. Removing background…');

    const resultBlob = await removeBackground(normalized.blob);
    setProgress(82, 'Background removed. Preparing transparent PNG…');

    const imageData = await blobToImageData(resultBlob);
    if (!imageData || !imageData.width || !imageData.height) {
      throw new Error('The background-removal service returned an empty image.');
    }

    automaticImageData = imageData;

    if (resultCanvas) {
      resultCanvas.width = imageData.width;
      resultCanvas.height = imageData.height;
      const ctx = resultCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not display the transparent result.');
      ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
      ctx.putImageData(imageData, 0, 0);
      resultCanvas.hidden = false;
    }

    if (resultEmpty) resultEmpty.hidden = true;
    if (download) download.disabled = false;
    if (editBtn) editBtn.disabled = false;

    setProgress(100, 'Background removed successfully. Your transparent PNG is ready.');
  } catch (error) {
    console.error('[BGErase] background-removal error:', error);

    if (resultCanvas) resultCanvas.hidden = true;
    if (resultEmpty) resultEmpty.hidden = false;
    if (download) download.disabled = true;
    if (editBtn) editBtn.disabled = true;

    const message = error?.message || 'We could not process this image. Please try again.';
    setProgress(0, message);
  } finally {
    setProcessingState(false);
  }
}

setBrushMode('restore');
if (brushSizeValue && brushSize) brushSizeValue.textContent = `${brushSize.value}px`;
