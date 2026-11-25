import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Horizontal carousel wrapper with desktop hover scroll controls and clean edge boundaries. */
export default function CarouselRow({ children, className = '', label = 'Anime list' }) {
  const rowRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const updateScrollState = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const left = el.scrollLeft > 8;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 8;
    setScrollState(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro?.disconnect();
    };
  }, [children, updateScrollState]);

  const scrollBy = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.78), behavior: 'smooth' });
  };

  return (
    <div className="carousel-wrap" role="region" aria-label={label}>
      {scrollState.left && (
        <button
          type="button"
          className="carousel-arrow prev"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <div ref={rowRef} className={`carousel-row ${className}`}>
        {children}
      </div>

      {scrollState.right && (
        <button
          type="button"
          className="carousel-arrow next"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

/** Shimmer skeleton placeholders matching horizontal poster carousels. */
export function CardRowSkeleton({ count = 7 }) {
  return (
    <div className="carousel-row" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

/** Shimmer skeleton placeholders matching multi-column grid views. */
export function CardGridSkeleton({ count = 12 }) {
  return (
    <div className="anime-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-grid-card" />
      ))}
    </div>
  );
}
