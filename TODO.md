# Задачи: мобильный zoom в ColoringPage + кнопки +/−

## Шаги

- [x] Изучить ColoringPage.jsx и coloring.scss
- [x] **ColoringPage.jsx**
  - [x] Перенести touch-обработчики с `wrapperRef` на `containerRef` (workspace)
  - [x] Добавить `useEffect` для синхронизации `zoomRef.current` с состоянием `zoom`
  - [x] Добавить `handleZoomIn` / `handleZoomOut` (±0.25, диапазон 0.5–3)
  - [x] Добавить кнопки `−` и `+` в панель действий после кнопки «Сохранить»
- [x] **coloring.scss**
  - [x] Добавить `touch-action: pan-x pan-y` в `.coloring-workspace`
  - [x] Убрать `margin-left: auto` у `.coloring-zoom-info`
  - [x] Добавить стили `.coloring-zoom-btn`
