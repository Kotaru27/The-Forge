import { useEffect, useRef } from 'react';
import rough from 'roughjs';

/**
 * A deterministic second pencil pass over the original hand-drawn card art.
 * Rendering is DOM-only: no React frame updates, layout changes or user events.
 * The reference artwork stays the primary drawing, this creates individual
 * pressure variations rather than repeating one border-image seven times.
 */
export function RoughInkFrame({ seed, spiral = false }: { seed: number; spiral?: boolean }) {
  const node = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = node.current;
    if (!svg) return;
    const pen = rough.svg(svg);
    const left = spiral ? 20 : 11;

    const dry = pen.rectangle(left, 10, 286 - left, 220, {
      seed,
      roughness: 1.12,
      bowing: 0.52,
      stroke: '#25292e',
      strokeWidth: 0.8,
      disableMultiStroke: false,
      preserveVertices: false,
    });
    dry.setAttribute('opacity', '0.58');

    const graphite = pen.line(left + 6, 233, 289, 233, {
      seed: seed + 19,
      roughness: 1.5,
      bowing: 0.85,
      stroke: '#48453d',
      strokeWidth: 0.65,
      disableMultiStroke: false,
    });
    graphite.setAttribute('opacity', '0.42');

    // A small shaded edge, not a repeat pattern or a fabricated shadow.
    const hatch = pen.rectangle(262, 191, 23, 30, {
      seed: seed + 31,
      stroke: 'transparent',
      fill: '#364053',
      fillStyle: 'hachure',
      fillWeight: 0.55,
      hachureGap: 6,
      hachureAngle: -35,
      roughness: 0.82,
    });
    hatch.setAttribute('opacity', '0.28');

    svg.replaceChildren(hatch, graphite, dry);
    return () => svg.replaceChildren();
  }, [seed, spiral]);

  return (
    <svg
      ref={node}
      className="ink-atelier-card-linework"
      viewBox="0 0 308 244"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    />
  );
}
