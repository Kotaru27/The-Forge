/** Graphite-pencil hero lettering: a layered, dry-grain drawing, not a marker font.
 * The h1 supplies accessible text; SVG is purely decorative.
 * The individual hatching strokes stay deterministic across React renders.
 */
export function PencilWordmark({ idPrefix = 'forge' }: { idPrefix?: string } = {}) {
  return (
    <svg className="pencil-wordmark-art" viewBox="0 0 670 115" role="presentation" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${idPrefix}-graphite-grain`} width="27" height="19" patternUnits="userSpaceOnUse">
          <rect width="27" height="19" fill="#27282a" />
          <path d="M-2 3 L18 1 M1 8 L27 5 M-3 13 L20 11 M3 18 L27 16" stroke="#77736a" strokeWidth="0.72" opacity="0.45" />
          <path d="M0 5 L9 3 M14 16 L24 13 M20 8 L27 7" stroke="#ebe2d0" strokeWidth="0.75" opacity="0.24" />
          <path d="M1 1 l4 2 M12 8 l6 1 M22 15 l3 1" stroke="#f1e8d8" strokeWidth="0.45" opacity="0.30" />
        </pattern>
        <filter id={`${idPrefix}-graphite-edge`} x="-3%" y="-6%" width="106%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.046" numOctaves="2" seed="24" result="pencilNoise" />
          <feDisplacementMap in="SourceGraphic" in2="pencilNoise" scale="1.25" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g transform="translate(19 96) rotate(-2.2 310 -42) skewX(-5)" filter={`url(#${idPrefix}-graphite-edge)`}>
        <text x="2" y="2" textLength="625" lengthAdjust="spacingAndGlyphs" fontSize="100" fontWeight="700" fontFamily="Kalam, cursive" fontStyle="italic" fill="#68635b" opacity=".27">THE FORGE</text>
        <text x="0" y="0" textLength="625" lengthAdjust="spacingAndGlyphs" fontSize="100" fontWeight="700" fontFamily="Kalam, cursive" fontStyle="italic" fill={`url(#${idPrefix}-graphite-grain)`} stroke="#26272a" strokeWidth=".75" paintOrder="stroke">THE FORGE</text>
      </g>
      {/* Side hatches and lightly erased construction ticks, separate from glyphs */}
      <g fill="none" stroke="#343538" strokeLinecap="round" opacity=".72">
        <path d="M3 29 l-10 -7 M8 45 l-13 0 M2 61 l-9 7 M655 27 l13 -7 M659 47 l14 0 M654 67 l12 8" strokeWidth="2" />
        <path d="M34 104 l70 -3 M411 106 l116 -2 M565 107 l46 -3" strokeWidth=".75" opacity=".35" />
      </g>
    </svg>
  );
}
