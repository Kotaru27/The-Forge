import type { ComponentProps } from 'react';

type PencilButtonProps = ComponentProps<'button'> & {
  /** Decorative drawing only: click handlers, button roles and state remain native. */
  pencilVariant?: 0 | 1 | 2;
};

/**
 * A real HTML button surrounded by graphite-pencil artwork. Separate pressure
 * passes and dry colored-pencil strokes are authored SVG, not CSS rough borders.
 * SVG is stable, hidden from accessibility and never receives pointer events.
 */
export function PencilButton({
  children,
  className = '',
  pencilVariant = 0,
  ...props
}: PencilButtonProps) {
  return (
    <button {...props} className={`pencil-art-button pencil-art-variant-${pencilVariant} ${className}`.trim()}>
      {children}
      <svg className="pencil-button-linework" viewBox="0 0 240 68" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <g className="pencil-button-paper">
          <path d="M9 11 C59 6 127 9 226 10 Q231 18 229 55 Q174 61 76 57 L10 56 Q7 39 9 11 Z" fill="#fbf6e9" />
          <path d="M11 14 Q96 9 227 14 L227 54 Q120 56 11 54 Z" fill="#f0e6d4" opacity=".27" />
        </g>
        <g className="pencil-button-yellow" fill="none" strokeLinecap="round">
          <path d="M13 25 Q62 19 117 22 T227 23" stroke="#e5bb46" strokeWidth="5" opacity=".28"/>
          <path d="M12 32 Q64 28 120 30 T224 30" stroke="#e7bc48" strokeWidth="4" opacity=".43"/>
          <path d="M14 38 Q64 35 117 37 T224 37" stroke="#cb9c34" strokeWidth="2.4" opacity=".28"/>
          <path d="M15 43 Q70 42 121 42 T222 43" stroke="#e8c966" strokeWidth="3" opacity=".28"/>
          <path d="M14 48 Q91 45 140 47 T218 48" stroke="#d8ab3d" strokeWidth="1.2" opacity=".30"/>
        </g>
        <g className="pencil-button-blue" fill="none" stroke="#344965" strokeLinecap="round" opacity=".34">
          <path d="M15 42 l18 -24 M23 49 l21 -29 M34 50 l17 -27 M183 51 l24 -32 M195 52 l22 -29 M211 48 l12 -15" strokeWidth=".8"/>
          <path d="M16 48 L40 20 M197 52 L222 21" strokeWidth=".42" opacity=".67"/>
        </g>
        <g className="pencil-button-graphite" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 10 Q38 7 70 8 T147 9 Q185 9 228 11 Q231 22 229 34 T228 56 Q182 59 128 58 Q72 58 10 57 Q7 33 10 10 Z"
                stroke="#343333" strokeWidth="1.75" opacity=".88"/>
          <path d="M12 13 Q70 10 130 11 T226 13 M226 14 Q229 33 226 53 M226 54 Q136 57 12 54 M13 53 Q10 35 12 14"
                stroke="#64605a" strokeWidth=".67" opacity=".67"/>
          <path d="M8 14 l8 -8 M226 8 l7 9 M8 53 l8 10 M226 60 l8 -8" stroke="#3d3c3a" strokeWidth=".7" opacity=".55"/>
          <path d="M15 16 l7 -6 M17 20 l10 -9 M211 14 l11 10 M214 13 l9 7 M14 51 l11 8 M18 49 l14 10 M204 56 l15 -14 M211 57 l10 -10"
                stroke="#48443e" strokeWidth=".56" opacity=".30" />
          <path d="M9 24 l-1 5 M230 38 l1 7" stroke="#242629" strokeWidth="2.3" opacity=".35"/>
          <path d="M27 7 l9 -1 M126 8 l12 0 M169 59 l12 1" stroke="#282828" strokeWidth=".8" opacity=".39"/>
        </g>
        <path className="pencil-button-focus" d="M4 6 Q65 2 134 4 T235 6 Q238 34 235 62 Q125 65 5 62 Z"
          fill="none" stroke="#a55343" strokeWidth="1.45" strokeDasharray="11 5 3 8" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

/** On-paper framing for the dense working toolbar, not an interactive layer. */
export function PencilDeckDrawing() {
  return (
    <svg className="pencil-command-deck-drawing" viewBox="0 0 1180 173" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#4a4742" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 17 Q269 12 563 16 T1170 17 L1171 160 Q919 164 597 161 T8 161 Q5 90 8 17 Z" strokeWidth="1.4" opacity=".64" />
        <path d="M12 20 Q384 17 760 18 T1167 20 M1167 24 Q1168 90 1167 156 M1167 157 Q572 162 13 157 M12 155 Q10 92 12 22" strokeWidth=".57" opacity=".5"/>
        <path d="M8 42 l11 -21 M8 53 l17 -30 M11 64 l18 -33 M11 75 l22 -38 M11 87 l19 -31 M14 100 l17 -30 M1151 161 l19 -32 M1138 161 l30 -47 M1123 161 l44 -67 M1114 159 l25 -31" strokeWidth=".6" opacity=".31" />
        <path d="M4 17 l11 -10 M1167 14 l8 -8 M8 159 l-5 7 M1169 161 l7 7" strokeWidth="1" opacity=".54" />
      </g>
      <path d="M26 14 Q88 11 153 12" stroke="#2f4562" strokeWidth=".8" fill="none" opacity=".35"/>
    </svg>
  );
}
