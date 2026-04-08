import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

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
    title: 'Раскраски онлайн - бесплатные раскраски для детей и взрослых',
    description: 'Раскраски онлайн бесплатно. Раскрашивайте картинки прямо в браузере без скачивания. Большая коллекция раскрасок для детей и взрослых.',
    keywords: 'раскраски онлайн, раскраски для детей, раскраски бесплатно, раскраски для взрослых, онлайн раскраски',
    canonical: 'https://risovanie.online/coloring'
  },
  '/gallery': {
    title: 'Галерея рисунков - лучшие работы пользователей',
    description: 'Галерея рисунков пользователей Рисование.Онлайн. Смотрите, оценивайте и добавляйте свои работы в галерею.',
    keywords: 'галерея рисунков, рисунки онлайн, галерея art, рисование онлайн галерея',
    canonical: 'https://risovanie.online/gallery'
  }
};

const OG_IMAGES = {
  '/': 'https://risovanie.online/static/og-main.png',
  '/coloring': 'https://risovanie.online/static/og-coloring.png',
  '/gallery': 'https://risovanie.online/static/og-gallery.png'
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

  const seoData = SEO_DATA[path];
  const finalData = seoData ? { ...seoData, ...dynamicSeo } : seoData;

  useEffect(() => {
    if (!finalData) return;

    document.title = finalData.title;

    // Update or create meta tags
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

    // Standard meta tags
    updateMeta('description', finalData.description);
    updateMeta('keywords', finalData.keywords);
    updateMeta('robots', 'index, follow');

    // Open Graph
    updateMeta('og:title', finalData.title, true);
    updateMeta('og:description', finalData.description, true);
    updateMeta('og:url', finalData.canonical, true);
    updateMeta('og:type', 'website', true);
    updateMeta('og:locale', 'ru_RU', true);
    updateMeta('og:site_name', 'Рисование.Онлайн', true);

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = finalData.canonical;

    // Update JSON-LD for specific pages
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
    }

  }, [path, finalData, dynamicSeo]);

  return null;
}

export default SeoMeta;
