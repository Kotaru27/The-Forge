import type { CSSProperties } from 'react';
import { PENCIL_GLYPH_PATHS } from './PencilGlyphPaths';

type PencilLetteringProps = {
  text: string;
  className?: string;
};

/**
 * Real centerline pencil strokes, not a masked paragraph or SVG font outline.
 *
 * Each character keeps its ORIGINAL Kalam HTML face and measured width,
 * enabling native wrapping and an unchanged accessible name. The animated SVG
 * path is decorative and contains NO duplicated text nodes. Typed inputs,
 * filename lists, result text, and other live values never use this component.
 */
function approximateGlyphAdvance(letter: string): string {
  // The original Kalam text sets the real layout width. These only size
  // decorative SVG ink overlays and have zero net inline advance.
  if (/[iIljtf1!.,:;'|]/.test(letter)) return '.32em';
  if (/[MWmw@%&]/.test(letter)) return '.89em';
  if (/[A-Z0-9]/.test(letter)) return '.67em';
  return '.56em';
}

export function PencilLettering({ text, className = '' }: PencilLetteringProps) {
  let position = 0;
  const parts = text.split(/(\s+)/);

  return (
    <span className={`pencil-written-text ${className}`.trim()}>
      {parts.map((part, group) => {
        if (/^\s+$/.test(part)) {
          position += part.length;
          return <span key={group}>{part}</span>;
        }

        return (
          <span key={group} className="pencil-written-word">
            {[...part].map((character, index) => {
              const order = position++;
              const path = PENCIL_GLYPH_PATHS[character];
              const variables = {
                '--pencil-letter-index': order,
                '--pencil-glyph-advance': approximateGlyphAdvance(character),
              } as CSSProperties;

              return (
                <span
                  key={index}
                  className={'pencil-written-glyph' + (path ? '' : ' is-direct-glyph')}
                  style={variables}
                >
                  <span className="pencil-glyph-face">{character}</span>
                  {path && (
                    <svg className="pencil-glyph-vector" viewBox="0 0 20 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                      <path
                        pathLength={1}
                        className="pencil-glyph-stroke"
                        d={path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  )}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
