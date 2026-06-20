/** Единая карта хоткеев инструментов (без Shift) */
export const TOOL_HOTKEYS = {
  hand: 'H',
  select: 'M',
  lasso: 'Q',
  brush: 'B',
  eraser: 'E',
  line: 'L',
  rect: 'R',
  circle: 'C',
  text: 'T',
  marker: 'K',
  airbrush: 'A',
  smudge: 'S',
  watercolor: 'W',
  oil: 'O',
  pastel: 'P',
  calligraphy: 'I',
  ellipse: 'U',
  stamp: 'Y',
  fill: 'F',
  pipette: 'D',
  polygon: 'N',
  arrow: 'J',
  grid: 'G',
};

const CYRILLIC_HOTKEY_ALIASES = {
  р: 'H', ь: 'M', й: 'Q', и: 'B', у: 'E', д: 'L', к: 'R', с: 'C', е: 'T',
  л: 'K', ф: 'A', ы: 'S', ц: 'W', щ: 'O', з: 'P', ш: 'I', г: 'U', н: 'Y',
  а: 'F', в: 'D', т: 'N', о: 'J', п: 'G',
};

export function getHotkeyForTool(toolName) {
  return TOOL_HOTKEYS[toolName] || null;
}

export function formatToolTooltip(label, toolName) {
  const key = getHotkeyForTool(toolName);
  return key ? `${label} (${key})` : label;
}

export function resolveHotkeyKey(key) {
  const lower = key.toLowerCase();
  const latin = CYRILLIC_HOTKEY_ALIASES[lower] || lower.toUpperCase();
  return latin;
}

export function findToolByHotkey(key) {
  const resolved = resolveHotkeyKey(key);
  const entry = Object.entries(TOOL_HOTKEYS).find(([, hotkey]) => hotkey === resolved);
  return entry ? entry[0] : null;
}
