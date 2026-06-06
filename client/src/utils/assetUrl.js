const DEFAULT_API_BASE = 'https://paint-online-back.onrender.com';

export const getApiBase = () => (
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : DEFAULT_API_BASE
);

export const resolveAssetUrl = (url, apiBase = getApiBase()) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;

  const path = url.startsWith('/') ? url : `/${url}`;

  if (path.startsWith('/files/') || path.startsWith('/uploads/')) {
    const normalized = path.replace(/^\/uploads\//, '/files/');
    return `${apiBase}${normalized}`;
  }

  if (path.startsWith('/coloring-pages/')) {
    return `${apiBase}/api${path}`;
  }

  return `${apiBase}/api${path}`;
};
