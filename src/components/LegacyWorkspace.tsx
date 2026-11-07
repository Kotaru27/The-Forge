import { useEffect, useRef, useState } from 'react';
import { isToolId, type ToolId } from '../tools';

interface Props {
  toolId: ToolId;
  onToolChange: (toolId: ToolId) => void;
}
type BridgeMessage =
  | { source: 'the-forge-bridge'; type: 'ready' }
  | { source: 'the-forge-bridge'; type: 'selected'; toolId: ToolId }
  | { source: 'the-forge-bridge'; type: 'error'; message: string };

export function LegacyWorkspace({ toolId, onToolChange }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onMessage(event: MessageEvent<BridgeMessage>) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.source !== 'the-forge-bridge') return;
      if (data.type === 'ready') { setReady(true); setError(''); }
      if (data.type === 'error') setError(data.message);
      if (data.type === 'selected' && typeof data.toolId === 'string' && isToolId(data.toolId)) onToolChange(data.toolId);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onToolChange]);

  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage(
      { source: 'the-forge-shell', type: 'open', toolId }, window.location.origin
    );
  }, [toolId, ready]);

  return (
    <div className="workspace">
      {!ready && <div className="workspace-status" role="status">Loading workspace…</div>}
      {error && <div className="workspace-error" role="alert">{error}</div>}
      <iframe
        ref={frame}
        title="The Forge tool workspace"
        src={import.meta.env.BASE_URL + 'legacy/index.html'}
        onLoad={() => {
          frame.current?.contentWindow?.postMessage(
            { source: 'the-forge-shell', type: 'hello' }, window.location.origin
          );
        }}
      />
    </div>
  );
}
