const BASE_URL = 'https://risovanie.online';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidUserUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function pluralDrawings(count) {
  const n = Math.abs(Number(count)) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'рисунок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'рисунка';
  return 'рисунков';
}

function buildProfileSeoMeta({ username, userId, drawingsCount = 0 }) {
  const safeName = String(username || 'Пользователь').trim() || 'Пользователь';
  const canonical = `${BASE_URL}/user/${userId}`;
  const title = `${safeName} — стена рисунков | Рисование.Онлайн`;
  const description = drawingsCount > 0
    ? `Публичная стена ${safeName}: ${drawingsCount} ${pluralDrawings(drawingsCount)} в галерее Рисование.Онлайн. Смотрите работы, ставьте лайки и добавляйте автора в друзья.`
    : `Профиль ${safeName} на Рисование.Онлайн. Публичная стена рисунков, галерея работ и творческое сообщество художников.`;
  const keywords = `${safeName}, стена рисунков, профиль художника, галерея рисунков, рисование онлайн, ${safeName} рисунки`;

  return {
    title,
    description,
    keywords,
    canonical,
    ogType: 'profile'
  };
}

function buildProfileIndexableHtml({ username, userId, drawings = [] }) {
  const safeName = escapeHtml(username);
  const profileUrl = `${BASE_URL}/user/${userId}`;
  const drawingsHtml = drawings.length > 0
    ? drawings.map((drawing) => (
      `<li><a href="${BASE_URL}/gallery/${drawing.id}">${escapeHtml(drawing.title)}</a>${drawing.likes_count ? ` — ${drawing.likes_count} лайков` : ''}</li>`
    )).join('')
    : '<li>Пока нет опубликованных рисунков на стене.</li>';

  return `<section style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
      <h1>${safeName} — стена рисунков</h1>
      <p>Публичный профиль пользователя ${safeName} на Рисование.Онлайн.</p>
      <p><a href="${profileUrl}">Открыть профиль ${safeName}</a></p>
      <h2>Рисунки на стене</h2>
      <ul>${drawingsHtml}</ul>
    </section>`;
}

function injectSeoIntoHtml(html, seo) {
  let result = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${escapeHtml(seo.description)}"`)
    .replace(/<meta name="keywords" content=".*?"/, `<meta name="keywords" content="${escapeHtml(seo.keywords)}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${escapeHtml(seo.title)}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${escapeHtml(seo.description)}"`)
    .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${seo.canonical}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${seo.canonical}"`);

  if (seo.ogType) {
    if (result.includes('property="og:type"')) {
      result = result.replace(/<meta property="og:type" content=".*?"/, `<meta property="og:type" content="${seo.ogType}"`);
    } else {
      result = result.replace('</head>', `<meta property="og:type" content="${seo.ogType}" />\n</head>`);
    }
  }

  return result;
}

module.exports = {
  BASE_URL,
  escapeHtml,
  isValidUserUuid,
  buildProfileSeoMeta,
  buildProfileIndexableHtml,
  injectSeoIntoHtml,
  pluralDrawings
};
