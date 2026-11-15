import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Viewport coordinates of the selected Home card, captured before routing. */
export type ToolOpenOrigin = { x: number; y: number; width: number; height: number };

type Props = {
  origin: ToolOpenOrigin;
  targetRef: RefObject<HTMLElement | null>;
};

/**
 * A noninteractive graphite-paper FLIP layer between a Home card and its
 * workspace. Routing happens immediately; the real tool is never scaled,
 * cloned, disabled or moved. Only this temporary decorative surface animates.
 *
 * Inspired by the restrained entrance timing of reuno-ui's Hero Section,
 * rather than copying that landing-page component or adding dependencies.
 */
export function ToolOpenTransition({ origin, targetRef }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const target = targetRef.current?.getBoundingClientRect();
    const sheet = sheetRef.current;
    if (!target || !sheet || target.width <= 0 || target.height <= 0) return;

    sheet.style.left = target.left + 'px';
    sheet.style.top = target.top + 'px';
    sheet.style.width = target.width + 'px';
    sheet.style.height = target.height + 'px';
    sheet.style.setProperty('--forge-open-dx', origin.x - target.x + 'px');
    sheet.style.setProperty('--forge-open-dy', origin.y - target.y + 'px');
    sheet.style.setProperty('--forge-open-sx', String(Math.max(.08, origin.width / target.width)));
    sheet.style.setProperty('--forge-open-sy', String(Math.max(.08, origin.height / target.height)));
  }, [origin, targetRef]);

  return (
    <div
      ref={sheetRef}
      className="forge-tool-opening-sheet"
      aria-hidden="true"
      data-motion="tool-card-to-workspace"
    >
      <svg viewBox="0 0 120 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="M5 8 Q50 4 115 9 M114 6 Q118 32 114 58 M115 56 Q58 62 6 56 M7 58 Q3 32 5 7" />
        <path d="M10 12 Q60 10 110 12 M110 53 Q64 55 10 52" opacity=".32" />
      </svg>
    </div>
  );
}
