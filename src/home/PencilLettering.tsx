import type { CSSProperties } from 'react';

type PencilLetteringProps = {
  text: string;
  className?: string;
};

/**
 * Authored handwriting on the existing Kalam glyph contours.
 *
 * The native span retains the EXACT original font metrics and wraps normally.
 * During a one-time entrance, an SVG text outline is stroked character by
 * character; pigment fills each letter before the native face takes over.
 * We never clip a completed line or animate live inputs/results.
 *
 * Decorative SVG text is ignored by accessibility APIs. The single phrase
 * remains the accessible name, and all original text is available without JS.
 */
function traceLength(character: string): string {
  if (/^[ilI1.!:,;|']$/.test(character)) return '2.8em';
  if (/^[MWmw@%&]$/.test(character)) return '8em';
  if (/^[frtJ7]$/.test(character)) return '3.7em';
  return '5.4em';
}

export function PencilLettering({ text, className = '' }: PencilLetteringProps) {
  let position = 0;
  const parts = text.split(/(\s+)/);
  return (
    <span className={`pencil-written-text ${className}`.trim()} role="text" aria-label={text}>
      {parts.map((part, group) => {
        if (/^\s+$/.test(part)) {
          position += part.length;
          return <span key={group} aria-hidden="true">{part}</span>;
        }

        return (
          <span key={group} className="pencil-written-word" aria-hidden="true">
            {[...part].map((character, index) => {
              const order = position++;
              const variables = {
                '--pencil-letter-index': order,
                '--pencil-glyph-length': traceLength(character),
              } as CSSProperties;

              return (
                <span key={index} className="pencil-written-glyph" style={variables}>
                  <span className="pencil-glyph-face">{character}</span>
                  <svg className="pencil-glyph-vector" aria-hidden="true" focusable="false">
                    <text x="0" y=".87em" className="pencil-glyph-stroke">{character}</text>
                  </svg>
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
