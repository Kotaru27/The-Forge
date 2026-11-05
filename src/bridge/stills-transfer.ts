import type { TransferDestination, TransferGroup, TransferResult } from '../tools/video-stills/engine';

let sequence = 0;
/** Crosses the same-origin temporary compatibility iframe; no file is uploaded to a server. */
export async function transferStillsToLegacy(destination: TransferDestination, groups: TransferGroup[]): Promise<TransferResult> {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="The Forge tool workspace"]');
  const target = iframe?.contentWindow;
  if (!target || !iframe) throw new Error('Storyboard workspace is unavailable.');
  // The legacy iframe may still be initializing while a short video is processing.
  // Wait for its explicit ready handshake rather than dropping the frame hand-off.
  const deadline = Date.now() + 20_000;
  while (iframe.dataset.ready !== 'true' || iframe.contentDocument?.readyState !== 'complete') {
    if (Date.now() >= deadline) throw new Error('Storyboard did not finish loading. Try again.');
    await new Promise<void>(resolve => setTimeout(resolve, 100));
  }
  if (!groups.length || !groups.some(group => group.frames.length)) throw new Error('No stills selected.');
  const requestId = `stills-${Date.now()}-${++sequence}`;
  return new Promise((resolve, reject) => {
    const release = () => { window.removeEventListener('message', onMessage); clearTimeout(timeout); };
    function onMessage(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== target) return;
      const data = event.data;
      if (data?.source !== 'the-forge-bridge' || data.type !== 'transfer-result' || data.requestId !== requestId) return;
      release();
      if (data.ok === true) resolve({ imported: data.imported, created: data.created, rejected: data.rejected, mode: data.mode });
      else reject(new Error(String(data.message || 'Storyboard transfer failed.')));
    }
    const timeout = setTimeout(() => { release(); reject(new Error('Storyboard transfer timed out.')); }, 120_000);
    window.addEventListener('message', onMessage);
    try {
      target.postMessage({ source: 'the-forge-shell', type: 'transfer-stills', requestId, destination, groups }, location.origin);
    } catch (cause) { release(); reject(cause); }
  });
}
