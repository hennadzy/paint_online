const { escapeHtml } = require('./profileSeo');

function injectNoindexIntoHtml(html, { title = 'Комната для рисования | Рисование.Онлайн' } = {}) {
  let result = html
    .replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex, nofollow"')
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, '')
    .replace(/<meta property="og:url" content="[^"]*"/, '')
    .replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content=""')
    .replace(/<meta name="keywords" content="[^"]*"/, '<meta name="keywords" content=""');

  result = result.replace(
    /<div style="position:\s*absolute;\s*left:\s*-9999px;[\s\S]*?<\/div>\s*<div id="root">/i,
    '<div id="root">'
  );

  result = result.replace(
    /<script type="application\/ld\+json">\s*\{[\s\S]*?"@type"\s*:\s*"SoftwareApplication"[\s\S]*?<\/script>\s*/i,
    ''
  );

  return result;
}

module.exports = {
  injectNoindexIntoHtml,
};
