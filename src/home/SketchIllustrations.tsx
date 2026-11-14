import type { ToolId } from '../tools';

/** Global SVG filters & pencil-hatch patterns for authentic hand-drawn ink & charcoal texture. */
export function SketchSvgDefs() {
  return (
    <svg className="sketch-svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {/* Rough charcoal dry-brush edge for hero wordmark only */}
        <filter id="sketch-charcoal" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.095" numOctaves="3" seed="14" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="3.0" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Hand-sketched diagonal pencil shading (light) */}
        <pattern id="pencil-shade-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(39)">
          <path d="M0 0 Q1.8 3.5 0.3 7" stroke="#2c333b" strokeWidth="1.05" strokeOpacity="0.28" fill="none" />
          <path d="M3.7 0 Q4.6 3.5 3.4 7" stroke="#2c333b" strokeWidth="0.75" strokeOpacity="0.18" fill="none" />
        </pattern>

        {/* Hand-sketched diagonal pencil shading (dense) */}
        <pattern id="pencil-shade-dense" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-41)">
          <path d="M0 0 Q1.3 2.7 0.2 5.5" stroke="#23272c" strokeWidth="1.2" strokeOpacity="0.44" fill="none" />
          <path d="M2.8 0 Q3.5 2.7 2.5 5.5" stroke="#23272c" strokeWidth="0.9" strokeOpacity="0.26" fill="none" />
        </pattern>

        {/* Crosshatch shadow pattern */}
        <pattern id="pencil-crosshatch" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6" stroke="#2a2d31" strokeWidth="1.15" strokeOpacity="0.34" />
          <path d="M0 2 L6 8 M2 0 L8 6" stroke="#2a2d31" strokeWidth="0.75" strokeOpacity="0.18" />
        </pattern>
      </defs>
    </svg>
  );
}

/** Hand-inked outer border around the full sketchbook spread (replaces straight CSS border). */
export function SketchPageFrameBorder() {
  return (
    <svg
      className="sketch-page-frame-svg"
      viewBox="0 0 1400 880"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7 Q460 3 930 6 T1394 5 Q1397 440 1395 874 Q940 877 470 874 T5 875 Q2 440 5 7 Z"
        stroke="#26282c"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        />
      <path
        d="M9 10 Q480 6 950 9 T1390 8 M1391 12 Q1393 440 1391 870 M1388 871 Q920 873 450 870 T9 871"
        stroke="#26282c"
        strokeWidth="1.05"
        strokeOpacity="0.45"
        strokeLinecap="round"
        />
    </svg>
  );
}

/** Vertical hand-inked seam separating the sidebar from the main workspace sheet. */
export function SketchVerticalDivider() {
  return (
    <svg
      className="sketch-vertical-divider"
      viewBox="0 0 12 880"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 2 Q4 220 6.5 440 T5.2 878"
        stroke="#272a2e"
        strokeWidth="2.1"
        strokeLinecap="round"
        />
      <path
        d="M7.5 18 Q8.5 250 6.8 500 T7.8 864"
        stroke="#272a2e"
        strokeWidth="0.9"
        strokeOpacity="0.42"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Rough spiral coil SVG used on the left notebook binding and Storyboard card. */
export function SketchSpiralRingSvg({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? 'sketch-spiral-svg is-compact' : 'sketch-spiral-svg'}
      viewBox="0 0 28 16"
      fill="none"
      aria-hidden="true"
    >
      {/* Paper punch hole shadow */}
      <circle cx="20.5" cy="8.5" r="3.4" fill="#b9ad95" stroke="#36393e" strokeWidth="1.2" filter="url(#sketch-wobble-fine)" />
      {/* Double-loop hand-sketched metal wire coil */}
      <path
        d="M2 8.5 C2 3.8, 17 3.2, 21.5 7.2 C22.8 8.4, 21.8 11.4, 17.5 11.8 C12.5 12.2, 3.2 12.2, 2 8.5 Z"
        fill="#e7decb"
        stroke="#25282c"
        strokeWidth="1.85"
        strokeLinecap="round"
        />
      <path
        d="M4.5 6.8 C9 5.3, 15.5 5.4, 19 7"
        stroke="#fffaf0"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Double-pass hand-inked border with corner overshoots and organic pencil shading for each tool card. */
export function SketchCardBorder({ spiral = false }: { spiral?: boolean }) {
  return (
    <svg
      className="sketch-card-border-svg"
      viewBox="0 0 308 228"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {/* Subtle outer graphite smudge / hatch strokes hugging bottom and right outside edge */}
      <path
        d="M18 219 Q154 222 293 217 Q299 180 298 22"
        stroke="#2b2d30"
        strokeWidth="4.5"
        strokeOpacity="0.11"
        strokeLinecap="round"
      />
      <path
        d="M16 218 L22 224 M28 218 L34 224 M42 218 L48 224 M58 218 L64 224 M74 218 L80 224 M92 218 L98 224 M110 218 L116 224 M128 218 L134 224 M148 218 L154 224 M168 218 L174 224 M188 218 L194 224 M208 218 L214 224 M228 218 L234 224 M248 218 L254 224 M268 218 L274 224 M286 216 L293 222 M296 28 L302 34 M296 48 L302 54 M296 68 L302 74 M296 88 L302 94 M296 108 L302 114 M296 128 L302 134 M296 148 L302 154 M296 168 L302 174 M296 188 L302 194 M295 204 L301 211"
        stroke="#2e3136"
        strokeWidth="1.05"
        strokeOpacity="0.46"
        strokeLinecap="round"
      />

      {/* Organic corner pencil shading triangles tucked inside corners */}
      <path d="M12 182 Q13 212 44 214 L12 214 Z" fill="url(#pencil-shade-light)" opacity="0.82" />
      <path d="M254 214 Q293 212 294 180 L294 214 Z" fill="url(#pencil-shade-light)" opacity="0.88" />
      <path d="M262 10 L294 10 L294 38 Q276 24 262 10 Z" fill="url(#pencil-shade-light)" opacity="0.62" />
      {!spiral && <path d="M11 10 L38 10 Q23 21 11 33 Z" fill="url(#pencil-shade-light)" opacity="0.52" />}

      {/* Rough hand-drawn outer ink pass with tiny sketchy corner overshoots */}
      <path
        d={
          spiral
            ? 'M16 10 Q154 6 296 11 M293 7 Q297 114 293 217 M297 214 Q154 218 15 214 M18 217 Q14 114 18 7'
            : 'M7 10 Q154 6 296 11 M293 7 Q297 114 293 217 M297 214 Q154 218 7 214 M10 217 Q6 114 10 7'
        }
        stroke="#222529"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        />
      {/* Faint offset double-ink pass around edges */}
      <path
        d={
          spiral
            ? 'M20 12.5 Q156 9 291 12.5 Q294 116 291 212 Q156 215 19 212'
            : 'M12 12.5 Q156 9 291 12.5 Q294 116 291 212 Q156 215 12 212 Q9 116 12 12.5'
        }
        stroke="#222529"
        strokeWidth="0.95"
        strokeOpacity="0.46"
        strokeLinecap="round"
        />
    </svg>
  );
}

/** Hand-drawn wavy ink rule for dividers. */
export function SketchDividerLine({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? 'sketch-wavy-divider is-compact' : 'sketch-wavy-divider'}
      viewBox="0 0 900 10"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path d="M2 5 Q150 2 300 5.5 T600 4.5 T898 5.2" stroke="#2c2e32" strokeWidth="1.5" strokeOpacity="0.72" />
      <path d="M12 6.6 Q240 8.5 460 5.4 T888 6.5" stroke="#2c2e32" strokeWidth="0.75" strokeOpacity="0.4" />
    </svg>
  );
}

/** Hand-sketched ink checkbox box + optional check mark. */
export function SketchCheckboxIcon({ checked }: { checked: boolean }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 3.5 L14.5 3 L14 14.8 L2.8 14.5 Z" fill="rgba(250,246,236,0.75)" strokeWidth="1.65" />
      <path d="M3 4.2 L13.8 3.6" strokeWidth="0.7" opacity="0.45" />
      {checked && <path d="M4.2 9.2 L7.6 12.8 L15.5 3.5" strokeWidth="2.3" />}
    </svg>
  );
}

/** Hand-sketched ink + yellow-highlighter waving hand matching the notebook mockup. */
export function SketchWavingHand() {
  return (
    <svg className="sketch-wave-svg" width="28" height="26" viewBox="0 0 32 30" fill="none" stroke="#24272b" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Motion ticks */}
      <path d="M4 9 L7 12 M3 15 L6 16 M25 4 L27 7 M28 11 L30 12" stroke="#2f4562" strokeWidth="1.4" />
      {/* Yellow marker filled palm & fingers */}
      <path
        d="M11 25 C8 22, 7 18, 9 14 L8 9 C8 7.5, 10 7.2, 10.7 9 L12 13 L12.5 6.5 C12.6 5, 14.8 5, 15 6.8 L15.3 13 L16.5 6.8 C16.9 5.2, 19 5.5, 18.8 7.3 L18 13.5 L20 9 C20.7 7.6, 22.6 8.3, 21.8 10.2 L19.5 16.5 L22.5 15.2 C24 14.5, 25 16.2, 23.4 17.5 C21 19.6, 18.5 23.8, 15.5 25.5 C13.8 26.4, 12 26, 11 25 Z"
        fill="#f3db7b"
        strokeWidth="1.6"
      />
      {/* Sketchy wrist line */}
      <path d="M12.2 26.8 Q15 27.6 17.2 26.2" strokeWidth="1.3" opacity="0.7" />
    </svg>
  );
}

/** Hand-sketched ink anvil mark matching the sketchbook sidebar header. */
export function AnvilMark({ size = 54 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.72)}
      viewBox="0 0 92 66"
      fill="none"
      stroke="#1f2328"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Horn + top face with pencil shading */}
      <path d="M6 20 C16 16, 25 15, 32 15 L71 13 L78 18 L68 25 C56 26, 47 28, 44 30 L33 30 C23 28, 12 24, 6 20 Z" fill="#dcd1bc" />
      <path d="M6 20 C16 16, 25 15, 32 15 L71 13 L78 18 L68 25 C56 26, 47 28, 44 30 L33 30 C23 28, 12 24, 6 20 Z" fill="url(#pencil-shade-light)" />
      <path d="M23 15.5 L72 13.5" strokeWidth="2.7" />
      {/* Waist & hatch */}
      <path d="M35 30 C36 38, 33 45, 24 50 L64 50 C55 45, 53 38, 54 29" fill="#efe6d4" />
      <path d="M37 34 L50 33.5 M36 39 L51 38.5 M34 44 L53 44 M42 31 L42 48" strokeWidth="1.15" opacity="0.6" />
      {/* Base */}
      <path d="M20 50 L68 50 L73 58 L16 58 Z" fill="url(#pencil-shade-dense)" />
      <path d="M20 50 L68 50 L73 58 L16 58 Z" strokeWidth="2.1" />
      {/* Rough ground hatch strokes */}
      <path d="M10 60 Q45 59 82 60 M18 62.5 L68 62" strokeWidth="1.2" opacity="0.55" />
    </svg>
  );
}

/** Hand-sketched stone brick forge with glowing embers, rough stone shading & rising smoke. */
export function ForgeKilnArt() {
  return (
    <svg
      className="sketch-kiln-svg"
      viewBox="0 0 264 114"
      fill="none"
      stroke="#232528"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Rising smoke curls (multi-pass pencil) */}
      <path d="M114 35 C106 24, 124 18, 113 8 C108 3, 123 1, 132 3" stroke="#635e54" strokeWidth="1.4" opacity="0.7" />
      <path d="M132 34 C140 24, 125 16, 137 7 C144 2, 155 4, 160 10" stroke="#635e54" strokeWidth="1.3" opacity="0.6" />
      <path d="M148 35 C155 27, 165 23, 170 13" stroke="#635e54" strokeWidth="1.1" opacity="0.45" />
      {/* Chimney */}
      <path d="M102 35 L105 53 L163 53 L161 35 Z" fill="#e5dbc6" />
      <path d="M102 35 L105 53 L163 53 L161 35 Z" fill="url(#pencil-shade-light)" />
      <path d="M98 30 L165 30 L163 36 L100 36 Z" fill="#d8ccb5" />
      <path d="M118 36 L119 52 M139 36 L138 52 M151 36 L151 44" strokeWidth="1.1" opacity="0.65" />
      {/* Main stone arch body */}
      <path d="M62 99 L69 52 L192 52 L202 99 Z" fill="#ebe2cf" />
      <path d="M62 99 L69 52 L192 52 L202 99 Z" fill="url(#pencil-shade-light)" opacity="0.7" />
      <path d="M66 66 L195 66 M64 81 L198 81" strokeWidth="1.15" opacity="0.6" />
      <path d="M90 52 L89 66 M125 52 L126 66 M158 52 L159 66 M78 66 L76 81 M181 66 L183 81" strokeWidth="1.15" opacity="0.6" />
      {/* Inner arch stones */}
      <path d="M98 100 C98 70, 163 70, 163 100" fill="#2a2320" strokeWidth="2.2" />
      <path d="M88 100 C88 60, 173 60, 173 100" strokeWidth="1.6" />
      <path d="M97 72 L103 78 M113 64 L117 72 M131 62 L131 70 M148 64 L144 72 M164 72 L158 78" strokeWidth="1.3" opacity="0.75" />
      {/* Fire & embers inside arch */}
      <path d="M111 99 C112 87, 120 82, 123 75 C126 83, 130 84, 131 73 C136 80, 142 85, 141 91 C144 87, 148 84, 149 99 Z" fill="#cf673e" stroke="#853017" strokeWidth="1.3" />
      <path d="M120 99 C121 91, 126 88, 129 82 C131 89, 137 90, 139 99 Z" fill="#f4c762" stroke="none" />
      {/* Left & right rocky flanks with dense pencil hatching */}
      <path d="M6 103 L28 83 L45 89 L64 68 L72 101 Z" fill="url(#pencil-shade-dense)" />
      <path d="M6 103 L28 83 L45 89 L64 68 L72 101" strokeWidth="1.6" />
      <path d="M190 100 L199 74 L218 85 L236 77 L256 103 Z" fill="url(#pencil-shade-dense)" />
      <path d="M190 100 L199 74 L218 85 L236 77 L256 103" strokeWidth="1.6" />
      {/* Ground sketch strokes */}
      <path d="M4 103 Q130 101 258 103 M20 107 Q110 105 190 107" strokeWidth="1.3" opacity="0.65" />
    </svg>
  );
}

/** Subtle bottom-left mountain peaks doodle in sidebar. */
export function MountainDoodle() {
  return (
    <svg width="84" height="30" viewBox="0 0 84 30" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 26 L21 7 L32 19 L44 5 L61 23 L69 15 L79 26" />
      <path d="M21 7 L26 26 L12 26 Z" fill="url(#pencil-shade-light)" stroke="none" />
      <path d="M44 5 L51 26 L36 26 Z" fill="url(#pencil-shade-light)" stroke="none" />
      <path d="M16 14 L22 18 M39 12 L46 17 M45 14 L50 22" opacity="0.65" />
      <path d="M2 27 Q42 25 81 27" opacity="0.55" />
    </svg>
  );
}

/** Subtle bottom-right sketched gears doodle on main canvas. */
export function GearsDoodle() {
  return (
    <svg width="82" height="66" viewBox="0 0 82 66" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="54" cy="42" r="14" fill="url(#pencil-shade-light)" />
      <circle cx="54" cy="42" r="6" fill="#f4ede0" />
      <path d="M54 24v4M54 56v4M36 42h4M68 42h4M41 29l3 3M64 52l3 3M67 29l-3 3M44 52l-3 3" />
      <circle cx="24" cy="54" r="9.5" fill="url(#pencil-shade-light)" />
      <circle cx="24" cy="54" r="3.5" fill="#f4ede0" />
      <path d="M24 41v3M24 64v0M11 54h3M34 54h3M15 45l2.5 2.5M30 60l2.5 2.5M33 45l-2.5 2.5M18 60l-2.5 2.5" />
    </svg>
  );
}

/** Hand-drawn curved terracotta arrow pointing from checklist toward hero title. */
export function ChecklistArrow() {
  return (
    <svg width="66" height="28" viewBox="0 0 66 28" fill="none" stroke="#b85337" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17 C19 23, 35 11, 59 12" />
      <path d="M50 7 L59 12 L51 18" />
    </svg>
  );
}

/** Rough hand-sketched SVG diagrams with double-pass ink outlines, pencil shading & overshoots for all 7 tools. */
export function SketchCardArt({ tool }: { tool: ToolId }) {
  const ink = '#202429';
  const slate = '#2d4360';
  const rust = '#b85337';

  switch (tool) {
    case 'logo-resizer':
      return (
        <svg viewBox="0 0 244 122" fill="none" stroke={ink} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Small rough dashed resize frame */}
          <path d="M26 42 H74 M73 41 V80 M74 79 H26 M27 80 V41" strokeDasharray="6 3.5" stroke={slate} strokeWidth="1.5" />
          <path d="M33 47 L67 47.5 L66.5 73.5 L33.5 73 Z" fill="#faf6ec" />
          <path d="M36 72 L46 59 L53 67 L59 60 L66 72 Z" fill="url(#pencil-shade-dense)" />
          <circle cx="59" cy="54" r="3.2" fill="#faf6ec" />
          {/* Bottom-left resize arrow */}
          <path d="M33 74 L20 86 M20 77 L20 86 L29 86" stroke={slate} strokeWidth="1.75" />
          {/* Center arrow with loose double stroke */}
          <path d="M80 60 Q94 58.5 107 60.5 M99 54 L108 60.5 L99 66.5" strokeWidth="2.1" />
          {/* Large rough dashed resize frame */}
          <path d="M113 17 L209 18 M207 15 L206 103 M208 101 L114 100 M116 102 L115 15" strokeDasharray="7 4" stroke={slate} strokeWidth="1.6" />
          <path d="M122 24 L201 24.5 L199 94 L122.5 93 Z" fill="#faf6ec" />
          {/* Sketchy second inner line */}
          <path d="M124 26 L198 26.5 M197 26 L196 92" strokeWidth="0.85" strokeOpacity="0.45" />
          <path d="M126 91 L150 53 L165 72 L178 57 L196 91 Z" fill="url(#pencil-shade-dense)" />
          <path d="M126 91 L150 53 L165 72 L178 57 L196 91" strokeWidth="1.65" />
          <path d="M150 53 L156 91 M178 57 L183 91" strokeWidth="0.95" opacity="0.55" />
          <circle cx="178" cy="40" r="7" fill="#faf6ec" />
          {/* Top-right expand arrow */}
          <path d="M198 25 L216 9 M206 9 L216 9 L216 19" stroke={slate} strokeWidth="1.85" />
        </svg>
      );

    case 'pdf-to-image':
      return (
        <svg viewBox="0 0 244 122" fill="none" stroke={ink} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Terracotta spark ticks */}
          <path d="M174 14 L177 5 M184 17 L191 10 M189 24 L197 22" stroke={rust} strokeWidth="1.7" />
          {/* PDF sheet with double ink line */}
          <path d="M40 17 L87 17.5 L101 32 L100 95 L40 94.5 Z" fill="#faf6ec" />
          <path d="M42 19 L86 19.5 M98 33 L97.5 93" strokeWidth="0.85" strokeOpacity="0.45" />
          <path d="M87 17.5 L87 32 L101 32" fill="url(#pencil-shade-light)" />
          <path d="M51 34 H78 M51 43 H74 M51 82 H88 M51 88 H76" strokeWidth="1.35" opacity="0.65" />
          {/* Rough terracotta PDF tag */}
          <path d="M27 51 L73 50.5 L71.5 73 L28 73.5 Z" fill={rust} stroke="#6b2715" strokeWidth="1.65" />
          <text x="50" y="66.5" textAnchor="middle" fill="#fff9f2" stroke="none" fontSize="13.5" fontWeight="700" fontFamily="Kalam, cursive">PDF</text>
          {/* Arrow */}
          <path d="M111 58 Q123 57 134 58.5 M126 52 L135 58.5 L126 65" strokeWidth="2.1" />
          {/* Stacked polaroid/image sketches */}
          <g transform="translate(154 23) rotate(5.5)">
            <path d="M0 0 L58 0.5 L57.5 63 L0.5 62.5 Z" fill="#ede4d2" />
            <path d="M0 0 L58 0.5 L57.5 63 L0.5 62.5 Z" fill="url(#pencil-shade-light)" />
          </g>
          <g transform="translate(144 30) rotate(-3)">
            <path d="M0 0 L59 0.5 L58.5 63 L0.5 62.5 Z" fill="#fbf8f1" />
            <path d="M6 7 L52 7.5 L51.5 47 L6.5 46.5 Z" fill="#f4ede0" />
            <path d="M8 45 L22 25 L31 37 L39 29 L50 45 Z" fill="url(#pencil-shade-dense)" />
            <path d="M8 45 L22 25 L31 37 L39 29 L50 45" strokeWidth="1.45" />
            <circle cx="40" cy="18" r="4.2" fill="#fffdf8" />
          </g>
        </svg>
      );

    case 'image-splitter':
      return (
        <svg viewBox="0 0 244 122" fill="none" stroke={ink} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Terracotta spark ticks */}
          <path d="M196 20 L201 12 M205 26 L213 21 M208 35 L217 35" stroke={rust} strokeWidth="1.7" />
          {/* Landscape frame with corner overshoots */}
          <path d="M44 18 L180 18.5 L179.5 100 L44.5 99.5 Z" fill="#faf6ec" />
          <path d="M41 18.5 L183 18.5 M44.5 15 L44.5 103 M179.5 15 L179.5 103 M41 99.5 L183 99.8" strokeWidth="0.95" strokeOpacity="0.48" />
          <path d="M47 97 L84 45 L108 73 L127 56 L168 97 Z" fill="url(#pencil-shade-dense)" />
          <path d="M47 97 L84 45 L108 73 L127 56 L168 97" strokeWidth="1.65" />
          <path d="M84 45 L92 97 M127 56 L133 97" strokeWidth="0.95" opacity="0.55" />
          <circle cx="147" cy="37" r="7.5" fill="#fffdf8" />
          {/* Heavy dashed cut lines */}
          <path d="M112 9 V108" strokeDasharray="5.5 4" strokeWidth="2.25" stroke={ink} />
          <path d="M34 59 H192" strokeDasharray="5.5 4" strokeWidth="2.25" stroke={ink} />
          {/* Hand-sketched scissors */}
          <g transform="translate(178 72)">
            <path d="M2 20 L25 4 M2 4 L25 20" strokeWidth="2.35" />
            <circle cx="28" cy="23" r="6.2" fill="#faf6ec" strokeWidth="2.15" />
            <circle cx="28" cy="3" r="6.2" fill="#faf6ec" strokeWidth="2.15" />
          </g>
        </svg>
      );

    case 'video-stills':
      return (
        <svg viewBox="0 0 244 122" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Terracotta spark ticks */}
          <path d="M204 20 L209 12 M213 24 L220 19 M217 32 L225 31" stroke={rust} strokeWidth="1.7" />
          {/* Charcoal-shaded filmstrip frame */}
          <path d="M26 25 L103 25.5 L102.5 94 L26.5 93.5 Z" fill="url(#pencil-shade-dense)" strokeWidth="2.15" />
          <path d="M24 27 L105 27 M26 92 L104 92" strokeWidth="0.9" strokeOpacity="0.4" />
          <path d="M38 34 L90 34.5 L89.5 84 L38.5 83.5 Z" fill="#faf6ec" />
          {/* Uneven sprocket holes */}
          <path d="M29.5 31h4.5v5h-4.5z M29.5 43h4.5v5h-4.5z M29.5 56h4.5v5h-4.5z M29.5 69h4.5v5h-4.5z M29.5 81h4.5v5h-4.5z" fill={ink} stroke="none" />
          <path d="M94 31h4.5v5h-4.5z M94 43h4.5v5h-4.5z M94 56h4.5v5h-4.5z M94 69h4.5v5h-4.5z M94 81h4.5v5h-4.5z" fill={ink} stroke="none" />
          {/* Play triangle */}
          <path d="M58 49 L75 59 L58 69 Z" fill="url(#pencil-shade-light)" strokeWidth="1.95" />
          {/* Arrow */}
          <path d="M111 59 Q122 58 133 59.5 M125 53 L134 59.5 L125 65.5" strokeWidth="2.1" />
          {/* Stacked extracted stills */}
          <path d="M164 21 L216 21.5 L215.5 65 L164.5 64.5 Z" fill="#ede4d2" />
          <path d="M155 31 L207 31.5 L206.5 75 L155.5 74.5 Z" fill="#f4ede0" />
          <path d="M145 42 L199 42.5 L198.5 88 L145.5 87.5 Z" fill="#fbf8f1" />
          <path d="M149 85 L164 62 L175 74 L183 66 L195 85 Z" fill="url(#pencil-shade-dense)" />
          <path d="M149 85 L164 62 L175 74 L183 66 L195 85" strokeWidth="1.45" />
          <circle cx="183" cy="54" r="4" fill="#fffdf7" />
        </svg>
      );

    case 'storyboard':
      return (
        <svg viewBox="0 0 284 122" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <g transform="translate(28 14) rotate(-2.5)">
            <path d="M0 0 L226 1 L225 94 L1 93 Z" fill="#fbf8f1" strokeWidth="2" />
            <path d="M-2 2 L228 2 M224 -1 L224 95" strokeWidth="0.9" strokeOpacity="0.45" />
            {/* Panel 1: sketched character */}
            <path d="M11 10 L73 10.5 L72.5 56 L11.5 55.5 Z" fill="#f5efe2" />
            <circle cx="42" cy="27" r="7" fill="#e6decb" />
            <path d="M35 24 C38 18, 49 18, 52 23 L56 23" />
            <path d="M30 55 C32 41, 52 41, 54 55" fill="url(#pencil-shade-dense)" />
            <text x="15" y="74" stroke="none" fill={slate} fontSize="11.5" fontFamily="Kalam, cursive">1.</text>
            <path d="M29 70 H66 M29 78 H57" stroke={slate} strokeWidth="1.35" opacity="0.75" />
            {/* Panel 2: crosshatched mountain */}
            <path d="M82 10 L144 10.5 L143.5 56 L82.5 55.5 Z" fill="#f5efe2" />
            <path d="M85 52 L106 27 L119 41 L127 33 L141 52 Z" fill="url(#pencil-shade-dense)" />
            <path d="M85 52 L106 27 L119 41 L127 33 L141 52" strokeWidth="1.35" />
            <text x="86" y="74" stroke="none" fill={slate} fontSize="11.5" fontFamily="Kalam, cursive">2.</text>
            <path d="M100 70 H136 M100 78 H126" stroke={slate} strokeWidth="1.35" opacity="0.75" />
            {/* Panel 3: sunset silhouette */}
            <path d="M153 10 L215 10.5 L214.5 56 L153.5 55.5 Z" fill="#f5efe2" />
            <circle cx="195" cy="24" r="6" fill="#f3db7b" />
            <path d="M195 14v2M195 32v2M185 24h2M203 24h2M188 17l2 2M201 30l2 2" strokeWidth="1.2" />
            <circle cx="172" cy="31" r="5.5" fill="#3a424a" />
            <path d="M161 55 C163 42, 181 42, 183 55" fill="#3a424a" />
            <path d="M155 48 H213" opacity="0.55" />
            <text x="157" y="74" stroke="none" fill={slate} fontSize="11.5" fontFamily="Kalam, cursive">3.</text>
            <path d="M171 70 H207 M171 78 H198" stroke={slate} strokeWidth="1.35" opacity="0.75" />
          </g>
        </svg>
      );

    case 'link-generator':
      return (
        <svg viewBox="0 0 284 122" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Terracotta spark lines */}
          <path d="M98 34 L91 27 M108 26 L104 17 M168 26 L173 17 M179 34 L186 27" stroke={rust} strokeWidth="1.8" />
          {/* Tilted hand-drawn chain link */}
          <g transform="translate(142 34) rotate(-32)">
            <rect x="-28" y="-9" width="32" height="18" rx="9" strokeWidth="3.5" stroke="#2c3036" fill="url(#pencil-shade-light)" />
            <rect x="-4" y="-9" width="32" height="18" rx="9" strokeWidth="3.5" stroke="#2c3036" fill="url(#pencil-shade-light)" />
          </g>
          {/* Rounded https://... URL bar */}
          <path d="M56 62 L226 62.5 Q236 63 236 73 L235.5 87 Q235 97 225 97.5 L56 98 Q46 97 46 87 L46.5 72 Q47 62.5 56 62 Z" fill="#faf6ec" strokeWidth="2.15" />
          <path d="M58 64.5 L224 64.5 M58 95.5 L224 95.5" strokeWidth="0.85" strokeOpacity="0.4" />
          <text x="64" y="86" stroke="none" fill={slate} fontSize="17.5" fontFamily="Kalam, cursive">https://...</text>
          {/* Copy icon */}
          <rect x="205" y="73" width="12" height="14" rx="2" fill="#faf6ec" strokeWidth="1.65" />
          <path d="M201 82 V70 C201 69, 202 68, 203 68 H213" strokeWidth="1.65" />
        </svg>
      );

    case 'ad-downloader':
      return (
        <svg viewBox="0 0 284 122" fill="none" stroke={ink} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Terracotta spark ticks */}
          <path d="M227 46 L234 41 M231 55 L240 54 M228 65 L235 70" stroke={rust} strokeWidth="1.7" />
          {/* Browser window */}
          <path d="M58 16 L198 16.5 Q204 17 204 23 L203.5 94 Q203 100 197 100 L58 99.5 Q52 99 52 93 L52.5 22 Q53 16 58 16 Z" fill="#faf6ec" strokeWidth="2.1" />
          <path d="M54 18.5 L201 19 M201 21 L201 97" strokeWidth="0.85" strokeOpacity="0.4" />
          <path d="M52 33 H204" strokeWidth="1.65" />
          <circle cx="64" cy="24.5" r="2.3" fill={ink} />
          <circle cx="74" cy="24.5" r="2.3" fill={ink} />
          <circle cx="84" cy="24.5" r="2.3" fill={ink} />
          {/* Play button with pencil fill */}
          <path d="M119 46 L141 58 L119 70 Z" fill="url(#pencil-shade-dense)" strokeWidth="1.95" />
          {/* Scrubber bar */}
          <path d="M68 83 H160" strokeWidth="1.95" />
          <path d="M68 83 H102" stroke={rust} strokeWidth="2.65" />
          <circle cx="103" cy="83" r="3.6" fill="#fffdf7" stroke={rust} strokeWidth="1.9" />
          {/* Download badge */}
          <rect x="166" y="54" width="52" height="50" rx="10" fill="#ede4d1" strokeWidth="2.15" />
          <rect x="166" y="54" width="52" height="50" rx="10" fill="url(#pencil-shade-light)" />
          <path d="M192 67 V87 M184 79 L192 88 L200 79" strokeWidth="2.35" />
          <path d="M180 93 H204" strokeWidth="2.15" />
        </svg>
      );
  }
}
