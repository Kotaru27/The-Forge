import { frameTimes, type FrameKind } from './engine';

export type ExtractedFrame = { num: number | 'storyboard'; type: FrameKind; blob: Blob };
export type ExtractProgress = { done: number; total: number };

function abortError(): DOMException { return new DOMException('Canceled', 'AbortError'); }
function guard(signal: AbortSignal) { if (signal.aborted) throw abortError(); }

function onVideoEvent(video: HTMLVideoElement, success: string, signal: AbortSignal, timeout = 20_000): Promise<void> {
  return new Promise((resolve, reject) => {
    guard(signal);
    let finished = false;
    const complete = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      video.removeEventListener(success, ok);
      video.removeEventListener('error', fail);
      signal.removeEventListener('abort', cancel);
      error ? reject(error) : resolve();
    };
    const ok = () => complete();
    const fail = () => complete(new Error('Browser cannot decode this video. Try MP4 or WebM.'));
    const cancel = () => complete(abortError());
    const timer = setTimeout(() => complete(new Error(`Video ${success} timed out.`)), timeout);
    video.addEventListener(success, ok, { once: true });
    video.addEventListener('error', fail, { once: true });
    signal.addEventListener('abort', cancel, { once: true });
  });
}

async function metadata(video: HTMLVideoElement, url: string, signal: AbortSignal) {
  const ready = onVideoEvent(video, 'loadedmetadata', signal);
  video.src = url;
  video.load();
  await ready;
  guard(signal);
  if (!video.videoWidth || !video.videoHeight) throw new Error('Video dimensions are unavailable.');
}
async function seek(video: HTMLVideoElement, time: number, signal: AbortSignal) {
  guard(signal);
  const target = Math.max(0, Math.min(time, video.duration - 0.001));
  if (Math.abs(video.currentTime - target) < 0.000001 && video.readyState >= 2) return;
  const done = onVideoEvent(video, 'seeked', signal);
  try { video.currentTime = target; }
  catch (error) { throw new Error(`Could not seek the video: ${String(error)}`); }
  await done;
  guard(signal);
}
function encode(canvas: HTMLCanvasElement, quality: number, signal: AbortSignal) {
  return new Promise<Blob>((resolve, reject) => {
    guard(signal);
    canvas.toBlob(blob => {
      if (signal.aborted) reject(abortError());
      else if (!blob) reject(new Error('Could not encode video frame.'));
      else resolve(blob);
    }, 'image/jpeg', quality);
  });
}

/** Original optional contact-sheet layout: 2×2, 3×2 or 3×3; white, no gap, cover-fit. */
export function drawContactSheet(canvases: HTMLCanvasElement[], width: number, height: number): HTMLCanvasElement {
  const columns = canvases.length === 4 ? 2 : 3;
  const rows = Math.ceil(canvases.length / columns);
  const sheet = document.createElement('canvas');
  sheet.width = width * columns;
  sheet.height = height * rows;
  const ctx = sheet.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  for (let index = 0; index < canvases.length; index++) {
    const frame = canvases[index];
    const scale = Math.max(width / frame.width, height / frame.height);
    const renderWidth = frame.width * scale;
    const renderHeight = frame.height * scale;
    ctx.drawImage(frame, index % columns * width + (width - renderWidth) / 2,
      Math.floor(index / columns) * height + (height - renderHeight) / 2, renderWidth, renderHeight);
  }
  return sheet;
}

/** Extract sequentially, releasing the media decoder and temporary URL even on cancel/failure. */
export async function extractVideo(file: File, signal: AbortSignal,
  onFrame: (frame: ExtractedFrame, progress: ExtractProgress) => void,
  onStart: (total: number) => void,
  contactSheetCount: 0 | 4 | 6 | 9 = 0,
): Promise<void> {
  guard(signal);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  const url = URL.createObjectURL(file);
  try {
    await metadata(video, url, signal);
    const times = frameTimes(video.duration);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    onStart(times.length + (contactSheetCount ? 1 : 0));
    for (let index = 0; index < times.length; index++) {
      guard(signal);
      await seek(video, times[index], signal);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await encode(canvas, 0.9, signal);
      onFrame({ num: index + 1, type: 'still', blob }, { done: index + 1, total: times.length + (contactSheetCount ? 1 : 0) });
      // Let React paint and keep the cancel button responsive between frames.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    if (contactSheetCount) {
      const thumbs: HTMLCanvasElement[] = [];
      for (let index = 1; index <= contactSheetCount; index++) {
        guard(signal);
        await seek(video, index * video.duration / (contactSheetCount + 1), signal);
        const still = document.createElement('canvas');
        still.width = canvas.width;
        still.height = canvas.height;
        const stillContext = still.getContext('2d');
        if (!stillContext) throw new Error('Canvas is not available.');
        stillContext.drawImage(video, 0, 0);
        thumbs.push(still);
      }
      const sheet = drawContactSheet(thumbs, canvas.width, canvas.height);
      const blob = await encode(sheet, 0.95, signal);
      onFrame({ num: 'storyboard', type: 'storyboard', blob }, { done: times.length + 1, total: times.length + (contactSheetCount ? 1 : 0) });
    }
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
