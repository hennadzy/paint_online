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
    description: 'Онлайн раскраски на Рисование.Онлайн: бесплатные картинки для раскрашивания в браузере. Выбирайте сюжет, раскрашивайте на телефоне и ПК, сохраняйте результат.',
    keywords: 'раскраски онлайн, картинки для раскрашивания, раскрашивать в браузере, раскраски для детей и взрослых, бесплатные раскраски',
    canonical: 'https://risovanie.online/coloring'
  },
  '/gallery': {
    title: 'Галерея рисунков пользователей - работы сообщества Рисование.Онлайн',
    description: 'Смотрите галерею рисунков пользователей: цифровые иллюстрации, скетчи и детские рисунки. Открывайте каждую работу, читайте комментарии и делитесь мнением.',
    keywords: 'галерея рисунков пользователей, рисунки онлайн, работы художников, цифровые рисунки, комментарии к рисункам',
    canonical: 'https://risovanie.online/gallery'
  },
  '/help': {
    title: 'Справка — Рисование.Онлайн | Ответы на вопросы',
    description: 'Справка по рисованию онлайн: как начать рисовать, настройки инструментов, создание комнат, авторизация, галерея, личные сообщения. Ответы на частые вопросы.',
    keywords: 'справка рисование онлайн, как рисовать, инструкции, настройки инструментов, создание комнат, авторизация, галерея, личные сообщения, частые вопросы',
    canonical: 'https://risovanie.online/help'
  }
};

const OG_IMAGES = {
  '/': 'https://risovanie.online/static/og-main.png',
  '/coloring': 'https://risovanie.online/static/og-coloring.png',
  '/gallery': 'https://risovanie.online/static/og-gallery.png',
  '/help': 'https://risovanie.online/static/og-help.png'
};

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
  const hasPaginationQuery = new URLSearchParams(location.search).has('page');

  const seoData = SEO_DATA[path] || (path.startsWith('/gallery/') ? SEO_DATA['/gallery'] : null);
  const finalData = seoData ? { ...seoData, ...dynamicSeo } : seoData;

  const isRoomPage = (() => {
    // комнаты роутятся как '/:id', где id — 9 символов A-Z a-z 0-9
    if (!path || path === '/') return false;
    const parts = path.split('/').filter(Boolean); // ['{id}'] либо []
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

    if (!finalData) return;

    document.title = finalData.title;

    updateMeta('description', finalData.description);
    updateMeta('keywords', finalData.keywords);
    updateMeta('robots', hasPaginationQuery ? 'noindex, follow' : 'index, follow');

    updateMeta('og:title', finalData.title, true);
    updateMeta('og:description', finalData.description, true);
    updateMeta('og:url', finalData.canonical, true);
    updateMeta('og:type', 'website', true);
    updateMeta('og:locale', 'ru_RU', true);
    updateMeta('og:site_name', 'Рисование.Онлайн', true);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = hasPaginationQuery ? finalData.canonical : (finalData.canonical || `https://risovanie.online${path}`);

    const existingLd = document.querySelector('script[type="application/ld+json"][data-page]');
    if (existingLd) {
      existingLd.remove();
    }

    if (path === '/coloring') {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-page', 'coloring');
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": finalData.title,
        "description": finalData.description,
        "url": finalData.canonical,
        "inLanguage": "ru"
      });
      document.head.appendChild(ld);
    } else if (path === '/gallery') {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-page', 'gallery');
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        "name": finalData.title,
        "description": finalData.description,
        "url": finalData.canonical,
        "inLanguage": "ru"
      });
      document.head.appendChild(ld);
    } else if (path === '/help') {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-page', 'help');
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "name": finalData.title,
        "description": finalData.description,
        "url": finalData.canonical,
        "inLanguage": "ru"
      });
      document.head.appendChild(ld);
    }
  }, [path, finalData, dynamicSeo, hasPaginationQuery, isRoomPage]);

  return null;
}

export default SeoMeta;
