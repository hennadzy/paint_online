import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isValidRoomId } from '../utils/routerUtils';

const SeoContext = createContext({
  title: null,
  description: null,
  setSeoData: () => {}
});

export const useSeo = () => useContext(SeoContext);

const SEO_DATA = {
  '/': {
    title: 'Рисование онлайн - совместное рисование без регистрации',
    description: 'Рисование онлайн в браузере бесплатно. Рисуйте вместе с друзьями в реальном времени. Графический редактор без установки: кисть, ластик, фигуры, текст.',
    keywords: 'рисование онлайн, рисовать онлайн, онлайн редактор, графический редактор онлайн, совместное рисование, paint online',
    canonical: 'https://risovanie.online/'
  },
  '/coloring': {
    title: 'Раскраски онлайн для детей и взрослых - раскрашивайте бесплатно',
    description: 'Онлайн раскраски на Рисование.Онлайн: бесплатные картинки для раскрашивания в браузере без скачивания. Мультфильмы, животные, природа, мандалы и другие разделы — раскрашивайте на телефоне и ПК.',
    keywords: 'раскраски онлайн, картинки для раскрашивания, раскрашивать в браузере, раскраски для детей и взрослых, бесплатные раскраски, раскраски без скачивания',
    canonical: 'https://risovanie.online/coloring'
  },
  '/gallery': {
    title: 'Галерея рисунков пользователей - работы сообщества Рисование.Онлайн',
    description: 'Галерея рисунков пользователей: смотрите работы авторов, открывайте профили и стены художников, ставьте лайки и комментируйте. Добавляйте друзей и следите за их новыми рисунками.',
    keywords: 'галерея рисунков пользователей, рисунки онлайн, стена рисунков, профили художников, лайки рисунков, комментарии к рисункам, друзья художников',
    canonical: 'https://risovanie.online/gallery'
  },
  '/help': {
    title: 'Справка — Рисование.Онлайн | Ответы на вопросы',
    description: 'Справка по рисованию онлайн: инструменты, комнаты, галерея, друзья, профили, стена рисунков, личные сообщения и уведомления. Ответы на частые вопросы.',
    keywords: 'справка рисование онлайн, как рисовать, галерея, друзья, профиль, стена рисунков, личные сообщения, уведомления, частые вопросы',
    canonical: 'https://risovanie.online/help'
  }
};

const NOINDEX_EXACT_PATHS = new Set([
  '/login',
  '/register',
  '/reset-password',
  '/profile',
  '/admin',
  '/friends',
  '/404'
]);

const OG_IMAGES = {
  '/': 'https://risovanie.online/static/og-main.png',
  '/coloring': 'https://risovanie.online/static/og-coloring.png',
  '/gallery': 'https://risovanie.online/static/og-gallery.png',
  '/help': 'https://risovanie.online/static/og-help.png'
};

function isUserProfilePath(path) {
  return /^\/user\/[0-9a-f-]{36}$/i.test(path);
}

function shouldIndexPath(path, search, dynamicSeo) {
  if (NOINDEX_EXACT_PATHS.has(path)) return false;
  if (new URLSearchParams(search).has('page')) return false;
  if (new URLSearchParams(search).get('feed') === 'friends') return false;
  if (dynamicSeo?.robots === 'noindex, follow' || dynamicSeo?.robots === 'noindex, nofollow') return false;

  return path === '/'
    || path === '/help'
    || path.startsWith('/help/')
    || path === '/gallery'
    || path.startsWith('/gallery/')
    || path === '/coloring'
    || path.startsWith('/coloring/')
    || isUserProfilePath(path);
}

export function SeoProvider({ children }) {
  const [dynamicSeo, setDynamicSeo] = useState(null);

  return (
    <SeoContext.Provider value={{ seoData: dynamicSeo, setSeoData: setDynamicSeo }}>
      {children}
    </SeoContext.Provider>
  );
}

export function SeoMeta() {
  const location = useLocation();
  const path = location.pathname;
  const { seoData: dynamicSeo } = useContext(SeoContext);

  const staticSeoData = SEO_DATA[path]
    || (path.startsWith('/gallery/') ? SEO_DATA['/gallery'] : null)
    || (path.startsWith('/coloring/') ? SEO_DATA['/coloring'] : null);

  const finalData = (staticSeoData || dynamicSeo)
    ? {
        ...(staticSeoData || {}),
        ...(dynamicSeo || {}),
        canonical: (dynamicSeo && dynamicSeo.canonical)
          || (staticSeoData && staticSeoData.canonical)
          || `https://risovanie.online${path}`,
      }
    : (isUserProfilePath(path) && dynamicSeo ? dynamicSeo : null);

  const isRoomPage = (() => {
    if (!path || path === '/') return false;
    const parts = path.split('/').filter(Boolean);
    if (parts.length !== 1) return false;
    return isValidRoomId(parts[0]);
  })();

  useEffect(() => {
    const updateMeta = (name, content, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector);

      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setProperty('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    if (isRoomPage) {
      updateMeta('robots', 'noindex, follow');
      return;
    }

    const shouldIndex = shouldIndexPath(path, location.search, dynamicSeo);

    if (!finalData) {
      updateMeta('robots', shouldIndex ? 'index, follow' : 'noindex, follow');
      return;
    }

    document.title = finalData.title;

    updateMeta('description', finalData.description);
    updateMeta('keywords', finalData.keywords);
    updateMeta('robots', dynamicSeo?.robots || (shouldIndex ? 'index, follow' : 'noindex, follow'));

    updateMeta('og:title', finalData.title, true);
    updateMeta('og:description', finalData.description, true);
    updateMeta('og:url', finalData.canonical, true);
    updateMeta('og:type', finalData.pageType === 'profile' ? 'profile' : 'website', true);
    updateMeta('og:locale', 'ru_RU', true);
    updateMeta('og:site_name', 'Рисование.Онлайн', true);

    const ogImage = OG_IMAGES[path] || OG_IMAGES['/gallery'];
    if (ogImage) {
      updateMeta('og:image', ogImage, true);
    }

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = finalData.canonical || `https://risovanie.online${path}`;

    document.querySelectorAll('script[type="application/ld+json"][data-page]').forEach((node) => node.remove());

    if (path === '/coloring') {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-page', 'coloring');
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: finalData.title,
        description: finalData.description,
        url: finalData.canonical,
        inLanguage: 'ru'
      });
      document.head.appendChild(ld);
    } else if (path === '/gallery') {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-page', 'gallery');
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        name: finalData.title,
        description: finalData.description,
        url: finalData.canonical,
        inLanguage: 'ru'
      });
      document.head.appendChild(ld);
    } else if (path === '/help') {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-page', 'help');
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        name: finalData.title,
        description: finalData.description,
        url: finalData.canonical,
        inLanguage: 'ru'
      });
      document.head.appendChild(ld);
    } else if (isUserProfilePath(path) && finalData.profileName) {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-page', 'profile');
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: finalData.title,
        description: finalData.description,
        url: finalData.canonical,
        inLanguage: 'ru',
        mainEntity: {
          '@type': 'Person',
          name: finalData.profileName,
          url: finalData.canonical
        }
      });
      document.head.appendChild(ld);
    }
  }, [path, location.search, finalData, dynamicSeo, isRoomPage]);

  return null;
}

export default SeoMeta;
