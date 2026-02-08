import { useEffect } from 'react';
import canvasState from '../store/canvasState';

const TRACK_VERTICAL_INSET = 20;
const TRACK_HORIZONTAL_INSET = 20;
const MIN_THUMB_SIZE = 24;

function getVerticalCornerGap() {
  return 0;
}

export function useCustomScrollbars(containerRef, isConnected) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || window.innerWidth > 768) return;

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

    const updateScrollbars = () => {
      if (!verticalScrollbar || !horizontalScrollbar || !container) return;

      const rect = container.getBoundingClientRect();
      const cornerGap = getVerticalCornerGap();
      const vv = window.visualViewport;
      const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const maxTrackBottom = viewportBottom - TRACK_VERTICAL_INSET;
      const trackHeight = Math.min(
        rect.height - TRACK_VERTICAL_INSET - cornerGap,
        Math.max(0, maxTrackBottom - rect.top)
      );
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollableRange = Math.max(0, scrollHeight - clientHeight);
      const hasScroll = scrollableRange > 0;

      verticalScrollbar.style.display = hasScroll ? 'block' : 'none';
      verticalScrollbar.style.top = `${rect.top}px`;
      verticalScrollbar.style.height = `${trackHeight}px`;
      verticalScrollbar.style.left = `${rect.right - 20}px`;
      verticalScrollbar.style.right = 'auto';

      if (hasScroll) {
        const thumbHeight = Math.max(
          MIN_THUMB_SIZE,
          (clientHeight / scrollHeight) * trackHeight
        );
        const thumbTravel = Math.max(0, trackHeight - thumbHeight);
        const scrollRatio = scrollableRange > 0 ? container.scrollTop / scrollableRange : 0;
        const thumbTop = thumbTravel * scrollRatio;

        verticalThumb.style.height = `${thumbHeight}px`;
        verticalThumb.style.top = `${thumbTop}px`;
      }

      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const horizontalScrollableRange = Math.max(0, scrollWidth - clientWidth);
      const hasHorizontalScroll = horizontalScrollableRange > 0;

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
          (clientWidth / scrollWidth) * trackWidth
        );
        const thumbTravel = Math.max(0, trackWidth - thumbWidth);
        const scrollRatio = horizontalScrollableRange > 0 ? container.scrollLeft / horizontalScrollableRange : 0;
        const thumbLeft = thumbTravel * scrollRatio;

        horizontalThumb.style.width = `${thumbWidth}px`;
        horizontalThumb.style.left = `${thumbLeft}px`;
      }
    };

    const handleVerticalThumbStart = (e) => {
      isVerticalDragging = true;
      const touch = e.touches?.[0];
      verticalStartPos = touch?.clientY ?? e.clientY;
      verticalStartScroll = container.scrollTop;
      verticalThumb.classList.add('active');
      e.preventDefault();
      e.stopPropagation();
    };

    const handleVerticalMove = (e) => {
      if (!isVerticalDragging) return;
      const touch = e.touches?.[0];
      const currentPos = touch?.clientY ?? e.clientY;
      const delta = currentPos - verticalStartPos;

      const trackHeight = container.clientHeight - TRACK_VERTICAL_INSET - getVerticalCornerGap();
      const thumbHeight = parseFloat(verticalThumb.style.height) || MIN_THUMB_SIZE;
      const thumbTravel = Math.max(0, trackHeight - thumbHeight);
      const scrollableRange = container.scrollHeight - container.clientHeight;

      if (thumbTravel > 0 && scrollableRange > 0) {
        const scrollDelta = (delta / thumbTravel) * scrollableRange;
        const next = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, verticalStartScroll + scrollDelta));
        container.scrollTop = next;
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
      e.preventDefault();
      e.stopPropagation();

      const scrollableRange = container.scrollHeight - container.clientHeight;
      if (scrollableRange <= 0) return;

      const trackRect = verticalScrollbar.getBoundingClientRect();
      const thumbRect = verticalThumb.getBoundingClientRect();
      const clickY = (e.touches?.[0]?.clientY ?? e.clientY) - trackRect.top;
      const thumbTop = thumbRect.top - trackRect.top;
      const thumbHeight = thumbRect.height;
      const page = container.clientHeight;

      if (clickY < thumbTop) {
        container.scrollTop = Math.max(0, container.scrollTop - page);
      } else if (clickY > thumbTop + thumbHeight) {
        container.scrollTop = Math.min(scrollableRange, container.scrollTop + page);
      }
      updateScrollbars();
    };

    const handleHorizontalThumbStart = (e) => {
      isHorizontalDragging = true;
      const touch = e.touches?.[0];
      horizontalStartPos = touch?.clientX ?? e.clientX;
      horizontalStartScroll = container.scrollLeft;
      horizontalThumb.classList.add('active');
      e.preventDefault();
      e.stopPropagation();
    };

    const handleHorizontalMove = (e) => {
      if (!isHorizontalDragging) return;
      const touch = e.touches?.[0];
      const currentPos = touch?.clientX ?? e.clientX;
      const delta = currentPos - horizontalStartPos;

      const trackWidth = container.clientWidth - TRACK_HORIZONTAL_INSET;
      const thumbWidth = parseFloat(horizontalThumb.style.width) || MIN_THUMB_SIZE;
      const thumbTravel = Math.max(0, trackWidth - thumbWidth);
      const scrollableRange = container.scrollWidth - container.clientWidth;

      if (thumbTravel > 0 && scrollableRange > 0) {
        const scrollDelta = (delta / thumbTravel) * scrollableRange;
        const next = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, horizontalStartScroll + scrollDelta));
        container.scrollLeft = next;
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
      e.preventDefault();
      e.stopPropagation();

      const scrollableRange = container.scrollWidth - container.clientWidth;
      if (scrollableRange <= 0) return;

      const trackRect = horizontalScrollbar.getBoundingClientRect();
      const thumbRect = horizontalThumb.getBoundingClientRect();
      const clickX = (e.touches?.[0]?.clientX ?? e.clientX) - trackRect.left;
      const thumbLeft = thumbRect.left - trackRect.left;
      const thumbWidth = thumbRect.width;
      const page = container.clientWidth;

      if (clickX < thumbLeft) {
        container.scrollLeft = Math.max(0, container.scrollLeft - page);
      } else if (clickX > thumbLeft + thumbWidth) {
        container.scrollLeft = Math.min(scrollableRange, container.scrollLeft + page);
      }
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

    const inner = container.querySelector('.canvas-container-inner');
    if (inner) {
      resizeObserver.observe(inner);
    }

    const handleScroll = () => {
      requestAnimationFrame(updateScrollbars);
    };
    container.addEventListener('scroll', handleScroll);

    const handleViewportChange = () => {
      requestAnimationFrame(updateScrollbars);
    };
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    const updateOnZoom = () => {
      requestAnimationFrame(() => {
        setTimeout(updateScrollbars, 50);
        setTimeout(updateScrollbars, 150);
      });
    };

    const originalSetZoom = canvasState.setZoom;
    canvasState.setZoom = function(zoom) {
      const result = originalSetZoom.call(this, zoom);
      updateOnZoom();
      return result;
    };

    updateScrollbars();
    const intervalId = setInterval(updateScrollbars, 1000);

    return () => {
      clearInterval(intervalId);

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

      container.removeEventListener('scroll', handleScroll);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      resizeObserver.disconnect();

      verticalScrollbar.remove();
      horizontalScrollbar.remove();
      canvasState.setZoom = originalSetZoom;
    };
  }, [isConnected]);
}
