import { useEffect } from 'react';
import { autorun } from 'mobx';
import canvasState from '../store/canvasState';
import {
  clampPanToMetrics,
  getMobileCanvasViewMetrics,
  panFromScroll,
} from '../utils/canvasViewMetrics';
import { isMobileCanvasView } from '../utils/pinchPanGestures';

const TRACK_VERTICAL_INSET = 20;
const TRACK_HORIZONTAL_INSET = 20;
const MIN_THUMB_SIZE = 24;

function getVerticalCornerGap() {
  return 0;
}

export function useCustomScrollbars(containerRef, wrapperRef, isConnected) {
  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper || !isMobileCanvasView() || window.innerHeight < window.innerWidth) {
      return undefined;
    }

    const verticalScrollbar = document.createElement('div');
    verticalScrollbar.className = 'custom-scrollbar vertical';
    const verticalThumb = document.createElement('div');
    verticalThumb.className = 'custom-scrollbar-thumb';
    verticalScrollbar.appendChild(verticalThumb);
    document.body.appendChild(verticalScrollbar);

    const horizontalScrollbar = document.createElement('div');
    horizontalScrollbar.className = 'custom-scrollbar horizontal';
    const horizontalThumb = document.createElement('div');
    horizontalThumb.className = 'custom-scrollbar-thumb';
    horizontalScrollbar.appendChild(horizontalThumb);
    document.body.appendChild(horizontalScrollbar);

    let isVerticalDragging = false;
    let isHorizontalDragging = false;
    let verticalStartPos = 0;
    let verticalStartScroll = 0;
    let horizontalStartPos = 0;
    let horizontalStartScroll = 0;
    let metricsRef = null;

    const readMetrics = () => {
      metricsRef = getMobileCanvasViewMetrics(container, wrapper, canvasState.viewZoom);
      return metricsRef;
    };

    const updateScrollbars = () => {
      if (!verticalScrollbar || !horizontalScrollbar || !container) return;

      const metrics = readMetrics();
      const rect = container.getBoundingClientRect();
      const cornerGap = getVerticalCornerGap();
      const vv = window.visualViewport;
      const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const maxTrackBottom = viewportBottom - TRACK_VERTICAL_INSET;
      const trackHeight = Math.min(
        rect.height - TRACK_VERTICAL_INSET - cornerGap,
        Math.max(0, maxTrackBottom - rect.top)
      );

      const hasVerticalScroll = Boolean(metrics && metrics.scrollableY > 0);
      verticalScrollbar.style.display = hasVerticalScroll ? 'block' : 'none';
      verticalScrollbar.style.top = `${rect.top}px`;
      verticalScrollbar.style.height = `${trackHeight}px`;
      verticalScrollbar.style.left = `${rect.right - 20}px`;
      verticalScrollbar.style.right = 'auto';

      if (hasVerticalScroll) {
        const thumbHeight = Math.max(
          MIN_THUMB_SIZE,
          (metrics.viewportHeight / metrics.contentHeight) * trackHeight
        );
        const thumbTravel = Math.max(0, trackHeight - thumbHeight);
        const scrollRatio = metrics.scrollableY > 0 ? metrics.scrollY / metrics.scrollableY : 0;
        const thumbTop = thumbTravel * scrollRatio;

        verticalThumb.style.height = `${thumbHeight}px`;
        verticalThumb.style.top = `${thumbTop}px`;
      }

      const hasHorizontalScroll = Boolean(metrics && metrics.scrollableX > 0);
      horizontalScrollbar.style.display = hasHorizontalScroll ? 'block' : 'none';
      horizontalScrollbar.style.left = `${rect.left}px`;
      horizontalScrollbar.style.width = `${rect.width - TRACK_HORIZONTAL_INSET}px`;
      const horizTop = rect.bottom - 20;
      horizontalScrollbar.style.top = `${Math.min(horizTop, viewportBottom - 20)}px`;
      horizontalScrollbar.style.height = '20px';

      if (hasHorizontalScroll) {
        const trackWidth = rect.width - TRACK_HORIZONTAL_INSET;
        const thumbWidth = Math.max(
          MIN_THUMB_SIZE,
          (metrics.viewportWidth / metrics.contentWidth) * trackWidth
        );
        const thumbTravel = Math.max(0, trackWidth - thumbWidth);
        const scrollRatio = metrics.scrollableX > 0 ? metrics.scrollX / metrics.scrollableX : 0;
        const thumbLeft = thumbTravel * scrollRatio;

        horizontalThumb.style.width = `${thumbWidth}px`;
        horizontalThumb.style.left = `${thumbLeft}px`;
      }
    };

    const handleVerticalThumbStart = (e) => {
      const metrics = readMetrics();
      if (!metrics || metrics.scrollableY <= 0) return;

      isVerticalDragging = true;
      const touch = e.touches?.[0];
      verticalStartPos = touch?.clientY ?? e.clientY;
      verticalStartScroll = metrics.scrollY;
      verticalThumb.classList.add('active');
      e.preventDefault();
      e.stopPropagation();
    };

    const handleVerticalMove = (e) => {
      if (!isVerticalDragging) return;

      const metrics = metricsRef || readMetrics();
      if (!metrics || metrics.scrollableY <= 0) return;

      const touch = e.touches?.[0];
      const currentPos = touch?.clientY ?? e.clientY;
      const delta = currentPos - verticalStartPos;

      const trackHeight = container.clientHeight - TRACK_VERTICAL_INSET - getVerticalCornerGap();
      const thumbHeight = parseFloat(verticalThumb.style.height) || MIN_THUMB_SIZE;
      const thumbTravel = Math.max(0, trackHeight - thumbHeight);

      if (thumbTravel > 0) {
        const scrollDelta = (delta / thumbTravel) * metrics.scrollableY;
        const nextScrollY = Math.max(0, Math.min(metrics.scrollableY, verticalStartScroll + scrollDelta));
        const nextPan = panFromScroll(metrics, metrics.scrollX, nextScrollY);
        canvasState.setViewPan(canvasState.viewPanX, nextPan.y);
        updateScrollbars();
      }

      e.preventDefault();
      e.stopPropagation();
    };

    const handleVerticalEnd = () => {
      isVerticalDragging = false;
      verticalThumb.classList.remove('active');
    };

    const handleVerticalTrackClick = (e) => {
      if (e.target !== verticalScrollbar) return;

      const metrics = readMetrics();
      if (!metrics || metrics.scrollableY <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      const trackRect = verticalScrollbar.getBoundingClientRect();
      const thumbRect = verticalThumb.getBoundingClientRect();
      const clickY = (e.touches?.[0]?.clientY ?? e.clientY) - trackRect.top;
      const thumbTop = thumbRect.top - trackRect.top;
      const thumbHeight = thumbRect.height;
      const page = metrics.viewportHeight;

      let nextScrollY = metrics.scrollY;
      if (clickY < thumbTop) {
        nextScrollY = Math.max(0, metrics.scrollY - page);
      } else if (clickY > thumbTop + thumbHeight) {
        nextScrollY = Math.min(metrics.scrollableY, metrics.scrollY + page);
      }

      const nextPan = panFromScroll(metrics, metrics.scrollX, nextScrollY);
      canvasState.setViewPan(canvasState.viewPanX, nextPan.y);
      updateScrollbars();
    };

    const handleHorizontalThumbStart = (e) => {
      const metrics = readMetrics();
      if (!metrics || metrics.scrollableX <= 0) return;

      isHorizontalDragging = true;
      const touch = e.touches?.[0];
      horizontalStartPos = touch?.clientX ?? e.clientX;
      horizontalStartScroll = metrics.scrollX;
      horizontalThumb.classList.add('active');
      e.preventDefault();
      e.stopPropagation();
    };

    const handleHorizontalMove = (e) => {
      if (!isHorizontalDragging) return;

      const metrics = metricsRef || readMetrics();
      if (!metrics || metrics.scrollableX <= 0) return;

      const touch = e.touches?.[0];
      const currentPos = touch?.clientX ?? e.clientX;
      const delta = currentPos - horizontalStartPos;

      const trackWidth = container.clientWidth - TRACK_HORIZONTAL_INSET;
      const thumbWidth = parseFloat(horizontalThumb.style.width) || MIN_THUMB_SIZE;
      const thumbTravel = Math.max(0, trackWidth - thumbWidth);

      if (thumbTravel > 0) {
        const scrollDelta = (delta / thumbTravel) * metrics.scrollableX;
        const nextScrollX = Math.max(0, Math.min(metrics.scrollableX, horizontalStartScroll + scrollDelta));
        const nextPan = panFromScroll(metrics, nextScrollX, metrics.scrollY);
        canvasState.setViewPan(nextPan.x, canvasState.viewPanY);
        updateScrollbars();
      }

      e.preventDefault();
      e.stopPropagation();
    };

    const handleHorizontalEnd = () => {
      isHorizontalDragging = false;
      horizontalThumb.classList.remove('active');
    };

    const handleHorizontalTrackClick = (e) => {
      if (e.target !== horizontalScrollbar) return;

      const metrics = readMetrics();
      if (!metrics || metrics.scrollableX <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      const trackRect = horizontalScrollbar.getBoundingClientRect();
      const thumbRect = horizontalThumb.getBoundingClientRect();
      const clickX = (e.touches?.[0]?.clientX ?? e.clientX) - trackRect.left;
      const thumbLeft = thumbRect.left - trackRect.left;
      const thumbWidth = thumbRect.width;
      const page = metrics.viewportWidth;

      let nextScrollX = metrics.scrollX;
      if (clickX < thumbLeft) {
        nextScrollX = Math.max(0, metrics.scrollX - page);
      } else if (clickX > thumbLeft + thumbWidth) {
        nextScrollX = Math.min(metrics.scrollableX, metrics.scrollX + page);
      }

      const nextPan = panFromScroll(metrics, nextScrollX, metrics.scrollY);
      canvasState.setViewPan(nextPan.x, canvasState.viewPanY);
      updateScrollbars();
    };

    const handleDocMouseMove = (e) => {
      if (isVerticalDragging) handleVerticalMove(e);
      if (isHorizontalDragging) handleHorizontalMove(e);
    };
    const handleDocTouchMove = (e) => {
      if (isVerticalDragging) handleVerticalMove(e);
      if (isHorizontalDragging) handleHorizontalMove(e);
    };
    const handleDocPointerEnd = () => {
      handleVerticalEnd();
      handleHorizontalEnd();
    };

    verticalThumb.addEventListener('mousedown', handleVerticalThumbStart);
    verticalThumb.addEventListener('touchstart', handleVerticalThumbStart, { passive: false });
    verticalScrollbar.addEventListener('mousedown', handleVerticalTrackClick);
    verticalScrollbar.addEventListener('touchstart', handleVerticalTrackClick, { passive: false });

    horizontalThumb.addEventListener('mousedown', handleHorizontalThumbStart);
    horizontalThumb.addEventListener('touchstart', handleHorizontalThumbStart, { passive: false });
    horizontalScrollbar.addEventListener('mousedown', handleHorizontalTrackClick);
    horizontalScrollbar.addEventListener('touchstart', handleHorizontalTrackClick, { passive: false });

    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('touchmove', handleDocTouchMove, { passive: false });
    document.addEventListener('mouseup', handleDocPointerEnd);
    document.addEventListener('touchend', handleDocPointerEnd);

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateScrollbars);
    });
    resizeObserver.observe(container);
    resizeObserver.observe(wrapper);

    const handleViewportChange = () => {
      requestAnimationFrame(updateScrollbars);
    };
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('resize', handleViewportChange);

    const disposeAutorun = autorun(() => {
      void canvasState.viewPanX;
      void canvasState.viewPanY;
      void canvasState.viewZoom;

      if (!isVerticalDragging && !isHorizontalDragging) {
        const metrics = readMetrics();
        const clamped = clampPanToMetrics(canvasState.viewPanX, canvasState.viewPanY, metrics);
        if (clamped.x !== canvasState.viewPanX || clamped.y !== canvasState.viewPanY) {
          canvasState.setViewPan(clamped.x, clamped.y);
        }
      }

      requestAnimationFrame(updateScrollbars);
    });

    updateScrollbars();

    return () => {
      disposeAutorun();

      verticalThumb.removeEventListener('mousedown', handleVerticalThumbStart);
      verticalThumb.removeEventListener('touchstart', handleVerticalThumbStart);
      verticalScrollbar.removeEventListener('mousedown', handleVerticalTrackClick);
      verticalScrollbar.removeEventListener('touchstart', handleVerticalTrackClick);

      horizontalThumb.removeEventListener('mousedown', handleHorizontalThumbStart);
      horizontalThumb.removeEventListener('touchstart', handleHorizontalThumbStart);
      horizontalScrollbar.removeEventListener('mousedown', handleHorizontalTrackClick);
      horizontalScrollbar.removeEventListener('touchstart', handleHorizontalTrackClick);

      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('touchmove', handleDocTouchMove);
      document.removeEventListener('mouseup', handleDocPointerEnd);
      document.removeEventListener('touchend', handleDocPointerEnd);

      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      resizeObserver.disconnect();

      verticalScrollbar.remove();
      horizontalScrollbar.remove();
    };
  }, [containerRef, wrapperRef, isConnected]);
}
