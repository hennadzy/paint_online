const TRANSLIT_MAP = {
  'Ё': 'YO', 'Й': 'I', 'Ц': 'TS', 'У': 'U', 'К': 'K', 'Е': 'E', 'Н': 'N', 'Г': 'G',
  'Ш': 'SH', 'Щ': 'SCH', 'З': 'Z', 'Х': 'H', 'Ъ': "'", 'ё': 'yo', 'й': 'i', 'ц': 'ts',
  'у': 'u', 'к': 'k', 'е': 'e', 'н': 'n', 'г': 'g', 'ш': 'sh', 'щ': 'sch', 'з': 'z',
  'х': 'h', 'ъ': "'", 'Ф': 'F', 'Ы': 'I', 'В': 'V', 'А': 'A', 'П': 'P', 'Р': 'R',
  'О': 'O', 'Л': 'L', 'Д': 'D', 'Ж': 'ZH', 'Э': 'E', 'ф': 'f', 'ы': 'i', 'в': 'v',
  'а': 'a', 'п': 'p', 'р': 'r', 'о': 'o', 'л': 'l', 'д': 'd', 'ж': 'zh', 'э': 'e',
  'Я': 'Ya', 'Ч': 'CH', 'С': 'S', 'М': 'M', 'И': 'I', 'Т': 'T', 'Ь': "'", 'Б': 'B',
  'Ю': 'YU', 'я': 'ya', 'ч': 'ch', 'с': 's', 'м': 'm', 'и': 'i', 'т': 't', 'ь': "'",
  'б': 'b', 'ю': 'yu',
};

function transliterate(word) {
  return String(word || '')
    .split('')
    .map((char) => TRANSLIT_MAP[char] || char)
    .join('');
}

function generateSlug(title) {
  if (!title) return '';

  return transliterate(title)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

async function ensureUniqueColoringPageSlug(pool, baseSlug, excludeId = null) {
  const slug = baseSlug || 'page';
  let candidate = slug;
  let suffix = 2;

  while (true) {
    const result = excludeId
      ? await pool.query(
          'SELECT id FROM coloring_pages WHERE slug = $1 AND id != $2 LIMIT 1',
          [candidate, excludeId]
        )
      : await pool.query(
          'SELECT id FROM coloring_pages WHERE slug = $1 LIMIT 1',
          [candidate]
        );

    if (result.rows.length === 0) {
      return candidate;
    }

    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueColoringSectionSlug(pool, baseSlug, excludeId = null) {
  const slug = baseSlug || 'section';
  let candidate = slug;
  let suffix = 2;

  while (true) {
    const result = excludeId
      ? await pool.query(
          'SELECT id FROM coloring_sections WHERE slug = $1 AND id != $2 LIMIT 1',
          [candidate, excludeId]
        )
      : await pool.query(
          'SELECT id FROM coloring_sections WHERE slug = $1 LIMIT 1',
          [candidate]
        );

    if (result.rows.length === 0) {
      return candidate;
    }

    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
}

module.exports = {
  transliterate,
  generateSlug,
  ensureUniqueColoringPageSlug,
  ensureUniqueColoringSectionSlug,
};
