const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://risovanie.online';
const BUILD_DIR = path.join(__dirname, '../../client/build');
const SITEMAP_FILENAME = 'sitemap.xml';

let cachedSitemapXml = null;

function formatDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().split('T')[0];
}

function buildStaticUrls(now) {
  return [
    { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/coloring`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/gallery`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/help`, changefreq: 'monthly', priority: '0.6' },
  ].map((entry) => ({ ...entry, lastmod: now }));
}

function buildFallbackSitemap(now) {
  const urls = buildStaticUrls(now);
  return wrapUrlset(urls);
}

function wrapUrlset(urlEntries) {
  const body = urlEntries.map((entry) => `
  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${entry.loc}"/>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}
</urlset>`;
}

async function generateSitemapXml(pgPool) {
  const now = new Date().toISOString().split('T')[0];

  if (!pgPool) {
    return buildFallbackSitemap(now);
  }

  try {
    const [resultDrawings, resultSections] = await Promise.all([
      pgPool.query(
        `SELECT id, approved_at, created_at
         FROM gallery_drawings
         WHERE status = 'approved'
         ORDER BY approved_at DESC
         LIMIT 5000`
      ),
      pgPool.query(
        `SELECT id, slug, created_at
         FROM coloring_sections
         ORDER BY created_at DESC
         LIMIT 5000`
      ),
    ]);

    const urlEntries = buildStaticUrls(now);

    for (const section of resultSections.rows) {
      const sectionSlug = encodeURIComponent(section.slug);
      const sectionDate = formatDate(section.created_at, now);

      urlEntries.push({
        loc: `${BASE_URL}/coloring/${sectionSlug}`,
        lastmod: sectionDate,
        changefreq: 'weekly',
        priority: '0.7',
      });

      const pagesResult = await pgPool.query(
        `SELECT slug, created_at
         FROM coloring_pages
         WHERE section_id = $1 AND is_active = true
         ORDER BY created_at DESC
         LIMIT 5000`,
        [section.id]
      );

      for (const page of pagesResult.rows) {
        const pageSlug = encodeURIComponent(page.slug);
        const pageDate = formatDate(page.created_at, now);

        urlEntries.push({
          loc: `${BASE_URL}/coloring/${sectionSlug}/${pageSlug}`,
          lastmod: pageDate,
          changefreq: 'weekly',
          priority: '0.6',
        });
      }
    }

    for (const drawing of resultDrawings.rows) {
      const drawingDate = formatDate(drawing.approved_at || drawing.created_at, now);

      urlEntries.push({
        loc: `${BASE_URL}/gallery/${drawing.id}`,
        lastmod: drawingDate,
        changefreq: 'monthly',
        priority: '0.7',
      });
    }

    return wrapUrlset(urlEntries);
  } catch (error) {
    console.error('Sitemap generation error:', error.message);
    return buildFallbackSitemap(now);
  }
}

function writeSitemapFile(xml) {
  if (!fs.existsSync(BUILD_DIR)) {
    return false;
  }

  fs.writeFileSync(path.join(BUILD_DIR, SITEMAP_FILENAME), xml, 'utf8');
  return true;
}

async function regenerateSitemap(pgPool) {
  const xml = await generateSitemapXml(pgPool);
  cachedSitemapXml = xml;

  const written = writeSitemapFile(xml);
  const urlCount = (xml.match(/<loc>/g) || []).length;

  console.log(`✅ Sitemap generated: ${urlCount} URLs${written ? ` → ${path.join(BUILD_DIR, SITEMAP_FILENAME)}` : ' (build dir missing, served from memory)'}`);

  return xml;
}

function getCachedSitemap() {
  return cachedSitemapXml;
}

module.exports = {
  generateSitemapXml,
  regenerateSitemap,
  getCachedSitemap,
  BASE_URL,
};
