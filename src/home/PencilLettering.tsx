import type { CSSProperties } from 'react';

/**
 * Hand-lettered text: the actual characters are revealed one glyph at a time.
 * Unlike the previous full-line clip wipe, the reveal follows reading order.
 * Original text stays accessible as a single phrase.
 */
export function PencilLettering({ text, className = '' }: { text: string; className?: string }) {
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
              return (
                <span
                  key={index}
                  className="pencil-written-glyph"
                  style={{ '--pencil-letter-index': order } as CSSProperties}
                >{character}</span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
