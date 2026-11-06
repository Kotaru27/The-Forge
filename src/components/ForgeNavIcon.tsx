import type { ToolId } from '../tools';

/**
 * Forge workroom navigation marks. Matching stroke geometry throughout the
 * Logo Resizer sidebar, while its approved LogoResizerIcon is left untouched.
 * Buttons in App.tsx provide the accessible tool name.
 */
export function ForgeNavIcon({ tool }: { tool: Exclude<ToolId, 'logo-resizer'> }) {
  const content = {
    'pdf-to-image': <>
      <path d="M8 3.5h10l5 5v18H8z" />
      <path d="M18 3.5v5h5" />
      <rect x="12" y="13.5" width="8" height="6.5" rx="0.8" />
      <path d="m13 18 2.6-2.6 1.6 1.6 1.7-1.7" />
      <path d="M12 23h8" />
    </>,
    'image-splitter': <>
      <rect x="4.5" y="5" width="23" height="22" rx="2" />
      <path d="M16 5v22M4.5 16h23" />
      <path d="m8 13 3-3 2 2" />
      <circle cx="22.5" cy="11" r="1.3" />
      <path d="m19 23 3-3 2 2" />
    </>,
    'video-stills': <>
      <rect x="4" y="7" width="24" height="18" rx="2" />
      <path d="M10 7v18M22 7v18M4 11h6m-6 10h6m12-10h6m-6 10h6" />
      <path d="m14 13 5 3-5 3z" />
    </>,
    'storyboard': <>
      <rect x="3.5" y="5" width="25" height="22" rx="2" />
      <path d="M12 5v22M20 5v22M3.5 14.5h25" />
      <path d="m6.5 11 2-2 1.2 1.2m4.7 9 2-2 1.1 1.1m4.5-7 2-2 1.2 1.2" />
    </>,
    'link-generator': <>
      <path d="M13 10.5 10.5 13a5.5 5.5 0 0 0 7.8 7.8l3.5-3.5a5.5 5.5 0 0 0-7.8-7.8l-1.2 1.2" />
      <path d="m19 21.5 2.5-2.5a5.5 5.5 0 0 0-7.8-7.8l-3.5 3.5a5.5 5.5 0 0 0 7.8 7.8l1.2-1.2" transform="translate(-4 -3)" />
    </>,
    'ad-downloader': <>
      <rect x="4.5" y="4.5" width="23" height="23" rx="2" />
      <path d="M10 11h12M10 15h12M10 19h7" />
      <path d="M19 20v5m-3-3 3 3 3-3" />
    </>,
  }[tool];

  return (
    <svg className="forge-v5-nav-icon" viewBox="0 0 32 32" width="27" height="27"
      aria-hidden="true" focusable="false" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {content}
    </svg>
  );
}
