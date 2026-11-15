import { useEffect, useRef, useState } from 'react';
import { IntroSketchArtwork } from './IntroSketchArtwork';
import { PencilWordmark } from '../home/PencilWordmark';

const SKETCH_DURATION_MS = 3450;
const HANDOFF_DURATION_MS = 1820;

type Props = {
  onHandoff: () => void;
  onFinish: () => void;
};

export function ForgeSketchIntro({ onHandoff, onFinish }: Props) {
  const [handoff, setHandoff] = useState(false);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onHandoff, onFinish });
  callbacksRef.current = { onHandoff, onFinish };

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      const wordmark = wordmarkRef.current;
      const destination = document.querySelector<SVGSVGElement>('.sketch-hero-center .pencil-wordmark-art');
      if (wordmark && destination) {
        // The SAME React PencilWordmark artwork is used at both ends. Compute
        // the one-time screen-space FLIP; never transform SVG paths in viewBox
        // coordinates, which previously caused the glitch and glyph mismatch.
        const from = wordmark.getBoundingClientRect();
        const to = destination.getBoundingClientRect();
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const scale = to.width / Math.max(1, from.width);
        wordmark.style.setProperty('--forge-handoff-x', dx.toFixed(2) + 'px');
        wordmark.style.setProperty('--forge-handoff-y', dy.toFixed(2) + 'px');
        wordmark.style.setProperty('--forge-handoff-scale', scale.toFixed(4));
      }
      setHandoff(true);
      callbacksRef.current.onHandoff();
    }, SKETCH_DURATION_MS);

    const t2 = window.setTimeout(
      () => callbacksRef.current.onFinish(),
      SKETCH_DURATION_MS + HANDOFF_DURATION_MS,
    );

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <section
      className={'forge-intro-portal' + (handoff ? ' is-handoff' : '')}
      aria-label="The Forge opening pencil sketch"
      role="dialog"
      aria-modal={!handoff}
      data-intro-stage={handoff ? 'handoff' : 'drawing'}
    >
      <div className="forge-intro-canvas">
        <IntroSketchArtwork />
        <div className="forge-intro-title-bridge" ref={wordmarkRef} aria-hidden="true">
          <PencilWordmark idPrefix="forge-intro" pencilWriting />
        </div>
      </div>
      <div className="forge-intro-footer" aria-hidden="true">
        <span className="forge-intro-progress" />
        <span>PENCIL / GRAPHITE / COLOR</span>
      </div>
      <button type="button" className="forge-intro-skip" onClick={() => callbacksRef.current.onFinish()}>
        Skip intro ↗
      </button>
    </section>
  );
}
