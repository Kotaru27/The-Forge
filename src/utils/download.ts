/** Starts a browser download without revoking its URL before the browser consumes it. */
export function downloadBlob(blob: Blob, filename: string, owned?: Set<string>): void {
  const url = URL.createObjectURL(blob);
  owned?.add(url);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    owned?.delete(url);
  }, 60_000);
}
