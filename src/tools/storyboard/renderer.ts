import {
  boardColumns, filmRowSizes, FIT_CIRCLES, FIT_HEIGHT, FIT_WIDTH, validBoardSettings,
  type BoardSettings, type CanvasSource, type FilmSettings, type FitSettings, type StoryFrame,
} from './engine';

function dimensions(source: CanvasSource): { width: number; height: number } {
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) throw Error('Image is not ready.');
  return { width, height };
}
function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192) {
    throw Error('Output canvas dimensions are invalid or exceed 8192 pixels.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Canvas is unavailable.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return [canvas, ctx];
}

/** Direct port of the CTK adaptive renderer's cover/contain + staged downsampling. */
export function resample(source: CanvasSource, targetW: number, targetH: number, mode: 'cover' | 'contain'): HTMLCanvasElement {
  const { width: srcW, height: srcH } = dimensions(source);
  const tw = Math.round(targetW), th = Math.round(targetH);
  const [canvas, ctx] = makeCanvas(tw, th);
  let dx = 0, dy = 0, dw = tw, dh = th;
  let sx = 0, sy = 0, sw = srcW, sh = srcH;
  const iR = srcW / srcH, cR = tw / th;
  if (mode === 'contain') {
    if (iR > cR) { dw = tw; dh = dw / iR; dy = (th - dh) / 2; }
    else { dh = th; dw = dh * iR; dx = (tw - dw) / 2; }
  } else {
    if (iR > cR) { sh = srcH; sw = sh * cR; sx = (srcW - sw) / 2; }
    else { sw = srcW; sh = sw / cR; sy = (srcH - sh) / 2; }
  }
  if (sw > dw * 2 || sh > dh * 2) {
    let cw = sw, ch = sh;
    let [current, currentCtx] = makeCanvas(Math.max(1, Math.round(cw)), Math.max(1, Math.round(ch)));
    currentCtx.drawImage(source, sx, sy, sw, sh, 0, 0, current.width, current.height);
    while (cw > dw * 2 && ch > dh * 2) {
      cw = Math.floor(cw / 2); ch = Math.floor(ch / 2);
      const [next, nextCtx] = makeCanvas(Math.max(1, Math.round(cw)), Math.max(1, Math.round(ch)));
      nextCtx.drawImage(current, 0, 0, next.width, next.height);
      current = next;
    }
    ctx.drawImage(current, 0, 0, current.width, current.height, dx, dy, dw, dh);
  } else {
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  return canvas;
}

export function renderBoard(frames: readonly StoryFrame[], options: BoardSettings): HTMLCanvasElement | null {
  if (!frames.length) return null;
  if (!validBoardSettings(options)) throw Error('Invalid dimensions. Set columns 0–3, gap 0–1000 and width 64–8192.');
  const count = frames.length;
  const cols = boardColumns(count, options.cols), rows = Math.ceil(count / cols);
  let maxSrcW = 0;
  const ratios: number[] = [];
  for (const frame of frames) {
    const { width, height } = dimensions(frame.image);
    maxSrcW = Math.max(maxSrcW, width);
    ratios.push(width / height);
  }
  ratios.sort((a, b) => a - b);
  const aspect = ratios[Math.floor(ratios.length / 2)] || 1;
  const gap = options.gap;
  let tileW: number, tileH: number, width: number, height: number;
  if (options.autoWidth) {
    const long = 1800;
    tileW = Math.min((long - gap * (cols - 1)) / cols, (long - gap * (rows - 1)) / (rows / aspect));
    if (maxSrcW > 0 && maxSrcW < tileW) tileW = maxSrcW;
    if (tileW < 280) tileW = 280;
    tileH = tileW / aspect;
    width = tileW * cols + gap * (cols - 1);
    height = tileH * rows + gap * (rows - 1);
  } else {
    width = options.width;
    tileW = (width - gap * (cols - 1)) / cols;
    tileH = tileW / aspect;
    height = tileH * rows + gap * (rows - 1);
  }
  if (width > 8192 || height > 8192) {
    const scale = Math.min(8192 / width, 8192 / height);
    width *= scale; height *= scale; tileW *= scale; tileH *= scale;
  }
  width = Math.round(width); height = Math.round(height);
  tileW = Math.round(tileW); tileH = Math.round(tileH);
  const [canvas, ctx] = makeCanvas(width, height);
  ctx.fillStyle = options.bgColor;
  ctx.fillRect(0, 0, width, height);
  for (let row = 0; row < rows; row++) {
    const n = Math.min(cols, count - row * cols);
    const shift = (cols - n) * (tileW + gap) / 2;
    for (let col = 0; col < n; col++) {
      const x = Math.round(col * (tileW + gap) + shift);
      const y = Math.round(row * (tileH + gap));
      const image = resample(frames[row * cols + col].image, tileW, tileH, options.fitMode);
      ctx.drawImage(image, x, y);
    }
  }
  return canvas;
}

export function renderFilmstrip(frames: readonly StoryFrame[], options: FilmSettings): HTMLCanvasElement {
  const width = 1920, rows = options.rows;
  if (rows < 1 || rows > 12 || options.framesPerRow < 0 || options.framesPerRow > 20 ||
    options.frameGap < 0 || options.frameGap > 200 || options.rowGap < 0 || options.rowGap > 200) throw Error('Invalid filmstrip layout.');
  const height = Math.round(width * (rows === 1 ? .35 : rows === 2 ? .55 : .74));
  const [canvas, ctx] = makeCanvas(width, height);
  ctx.fillStyle = options.bgColor; ctx.fillRect(0, 0, width, height);
  const marginV = Math.round(height * .025), marginH = Math.round(width * .02);
  const gapRows = options.rowGap;
  const stripH = Math.floor((height - marginV * 2 - (rows - 1) * gapRows) / rows);
  const stripW = width - marginH * 2;
  const sizes = filmRowSizes(frames.length, rows, options.framesPerRow);
  let cursor = 0;
  for (let row = 0; row < rows; row++) {
    const x = marginH, y = marginV + row * (stripH + gapRows);
    const trackH = Math.max(16, Math.round(stripH * .082));
    const areaH = stripH - 2 * trackH;
    const areaY = y + trackH;
    const indent = Math.round(stripW * .016);
    ctx.fillStyle = options.filmColor;
    ctx.fillRect(x, y, stripW, trackH);
    ctx.fillRect(x, y + stripH - trackH, stripW, trackH);
    ctx.fillRect(x + indent, areaY, stripW - 2 * indent, areaH);
    const holeW = Math.max(8, Math.round(trackH * .44)), holeH = Math.max(12, Math.round(trackH * .64));
    const holeR = Math.max(2, Math.round(holeW * .3)), pitch = Math.round(holeW * 1.95);
    const top = y + (trackH - holeH) / 2;
    const bot = y + stripH - trackH + (trackH - holeH) / 2;
    ctx.fillStyle = options.bgColor;
    for (let holeX = x + Math.round(pitch * .75); holeX + holeW <= x + stripW - Math.round(pitch * .75); holeX += pitch) {
      for (const holeY of [top, bot]) {
        ctx.beginPath(); ctx.roundRect(holeX, holeY, holeW, holeH, holeR); ctx.fill();
      }
    }
    const k = sizes[row];
    if (!k) continue;
    const areaX = x + indent, areaW = stripW - 2 * indent;
    const padY = Math.round(areaH * .035), padX = Math.round(areaW * .012);
    const innerW = areaW - padX * 2, innerH = areaH - padY * 2;
    const cellW = (innerW - (k - 1) * options.frameGap) / k;
    for (let j = 0; j < k; j++) {
      const index = options.framesPerRow ? row * options.framesPerRow + j : cursor++;
      const frame = frames[index];
      if (!frame) continue;
      const x0 = Math.round(areaX + padX + j * (cellW + options.frameGap));
      ctx.drawImage(resample(frame.image, Math.round(cellW), Math.round(innerH), options.fitMode), x0, Math.round(areaY + padY));
      if (options.showNumbers) {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = `bold ${Math.max(10, Math.round(trackH * .42))}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(String(index + 1).padStart(2, '0') + 'A', x0 + 4, Math.round(areaY - 4));
      }
    }
  }
  return canvas;
}

export type FitLayout = { lines: string[]; size: number; step: number; blockHeight: number; fits: boolean };
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.replace(/\r/g, '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const tested = line ? `${line} ${word}` : word;
    if (ctx.measureText(tested).width <= maxWidth) { line = tested; continue; }
    if (line) { lines.push(line); line = ''; }
    let part = '';
    for (const char of word) {
      const next = part + char;
      if (part && ctx.measureText(next).width > maxWidth) { lines.push(part); part = char; }
      else part = next;
    }
    line = part;
  }
  if (line) lines.push(line);
  return lines;
}
export function fitText(ctx: CanvasRenderingContext2D, text: string, preferred: number): FitLayout {
  let backup: FitLayout = { lines: [], size: preferred, step: preferred, blockHeight: 0, fits: false };
  for (let size = preferred; size >= 7.5; size -= .5) {
    ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    const lines = wrapText(ctx, text, 132), step = size * 1.01, blockHeight = lines.length * step;
    const fits = blockHeight <= 147 && lines.every((line, i) => {
      const y = -blockHeight / 2 + (i + .5) * step;
      const envelope = Math.min(85, Math.abs(y) + size * .36);
      const chord = Math.sqrt(Math.max(0, 86 ** 2 - envelope ** 2));
      return -52 >= -chord - 3 && -52 + ctx.measureText(line).width <= chord + 3;
    });
    backup = { lines, size, step, blockHeight, fits };
    if (fits) return backup;
  }
  return backup;
}

export function renderFit(source: CanvasSource | null, options: FitSettings): { canvas: HTMLCanvasElement; ready: boolean; message: string } {
  const scale = options.resolution;
  const [canvas, ctx] = makeCanvas(FIT_WIDTH * scale, FIT_HEIGHT * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, FIT_WIDTH, FIT_HEIGHT);
  const statement = options.statement.trim();
  const layout = statement ? fitText(ctx, statement, options.fontSize) : null;
  for (const pair of FIT_CIRCLES) {
    const { imageX: x, y } = pair;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 90, 0, Math.PI * 2); ctx.fill();
    if (source) {
      const { width, height } = dimensions(source);
      const boxSize = 180 * options.imageSize / 100;
      const ratio = options.imageFit === 'cover' ? boxSize / Math.min(width, height) : boxSize / Math.max(width, height);
      const drawW = width * ratio, drawH = height * ratio;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, 88, 0, Math.PI * 2); ctx.clip();
      if (options.imageFit === 'cover') {ctx.beginPath(); ctx.rect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize); ctx.clip();}
      ctx.drawImage(source, x - drawW / 2, y - drawH / 2, drawW, drawH); ctx.restore();
    } else {
      ctx.fillStyle = '#d4d4d4';ctx.font = '700 12px Arial,sans-serif';ctx.textAlign = 'center';ctx.fillText('STORYBOARD', x, y + 4);
    }
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 2.2;ctx.beginPath();ctx.arc(x, y, 90, 0, Math.PI * 2);ctx.stroke();
  }
  for (const pair of FIT_CIRCLES) {
    const { textX: x, textY: y } = pair;
    ctx.fillStyle = '#ffffff'; ctx.beginPath();ctx.arc(x, y, 90, 0, Math.PI * 2);ctx.fill();
    ctx.strokeStyle = '#006cde';ctx.lineWidth = 2.2;ctx.beginPath();ctx.arc(x, y, 90, 0, Math.PI * 2);ctx.stroke();
    if (!layout?.lines.length) continue;
    ctx.save(); ctx.beginPath();ctx.arc(x, y, 87, 0, Math.PI * 2);ctx.clip();
    ctx.font = `700 ${layout.size}px Arial,Helvetica,sans-serif`;
    ctx.fillStyle = '#111111';ctx.textAlign = 'left';ctx.textBaseline = 'middle';
    const start = y - layout.blockHeight / 2;
    layout.lines.forEach((line, i) => ctx.fillText(line, x - 52, start + (i + .5) * layout.step));
    ctx.restore();
  }
  const ready = !!source && !!statement && !!layout?.fits;
  let message = `Ready to export (${canvas.width} × ${canvas.height})`;
  if (!source) message = 'Upload a storyboard image or use the current Grid Board.';
  else if (!statement) message = 'Enter a statement to enable export.';
  else if (!layout?.fits) message = 'The statement cannot fit inside the circles. Shorten it to avoid clipping.';
  else if (layout.size < 12) message = `Preview ready (${canvas.width} × ${canvas.height}); text reduced to ${layout.size}px.`;
  return { canvas, ready, message };
}

export function encodeCanvas(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!canvas.width || !canvas.height) return reject(Error('No board preview available.'));
    try {canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(Error('Canvas could not be encoded.')), type, .95);}
    catch (error) {reject(error);}
  });
}
