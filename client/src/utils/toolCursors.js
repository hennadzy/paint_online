const svg = (content) => `data:image/svg+xml,${encodeURIComponent(content)}`;

export const HAND_GRAB_CURSOR = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M9.5 22.5c-2.2 0-4-2.2-4-5.2V12.8c0-1.4 1-2.3 2.2-2.3 1 0 1.8.7 2 1.7l.3 2.3.8-5.8c.2-1.3 1.2-2.2 2.4-2.2 1.3 0 2.3 1 2.3 2.3v5.2l.7-3.5c.2-1.2 1.2-2.1 2.4-2.1 1.2 0 2.2.9 2.2 2.1v5.8l.8-2.8c.2-1.1 1.1-1.9 2.2-1.9 1.2 0 2.1.9 2.1 2.1v5.2c0 3.6-2.8 6.5-6.4 6.5h-5.8c-2.8 0-5.2-2.1-5.2-5z" fill="#ffffff" stroke="#000000" stroke-width="1.35" stroke-linejoin="round"/>
  </svg>`
);

export const SELECT_CROSSHAIR_CURSOR = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <line x1="12" y1="3" x2="12" y2="21" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="3" y1="12" x2="21" y2="12" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="12" y1="3" x2="12" y2="21" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="12" x2="21" y2="12" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
);

export const LASSO_CURSOR = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M5 17 C6 8 10 6 14 8 C18 10 19 14 17 17 C15 20 10 21 7 19" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M5 17 C6 8 10 6 14 8 C18 10 19 14 17 17 C15 20 10 21 7 19" fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
);

export const MOVE_CURSOR = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M12 3l-3.5 3.5h7zM12 21l-3.5-3.5h7zM3 12l3.5-3.5v7zM21 12l-3.5-3.5v7z" fill="#ffffff" stroke="#ffffff" stroke-width="0.5" stroke-linejoin="round"/>
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 3l-3.5 3.5h7zM12 21l-3.5-3.5h7zM3 12l3.5-3.5v7zM21 12l-3.5-3.5v7z" fill="#000000" stroke="#000000" stroke-width="0.5" stroke-linejoin="round"/>
  </svg>`
);

export function cursorUrl(dataUrl, hotspotX, hotspotY, fallback) {
  return `url("${dataUrl}") ${hotspotX} ${hotspotY}, ${fallback}`;
}

export const HAND_GRAB_STYLE = cursorUrl(HAND_GRAB_CURSOR, 10, 10, 'grab');
export const HAND_GRABBING_STYLE = cursorUrl(HAND_GRAB_CURSOR, 10, 10, 'grabbing');
export const SELECT_CURSOR_STYLE = cursorUrl(SELECT_CROSSHAIR_CURSOR, 12, 12, 'crosshair');
export const LASSO_CURSOR_STYLE = cursorUrl(LASSO_CURSOR, 8, 12, 'crosshair');
export const MOVE_CURSOR_STYLE = cursorUrl(MOVE_CURSOR, 12, 12, 'move');
