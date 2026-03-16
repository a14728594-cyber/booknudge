import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef(null);
  const threshold = 72;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY === 0) {
      setPulling(true);
      setPullY(Math.min(dy * 0.4, threshold + 20));
    }
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= threshold) {
      setRefreshing(true);
      setPullY(threshold);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullY(0);
    startY.current = null;
  }, [pullY, threshold, onRefresh]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ position: 'relative' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pulling || refreshing ? pullY : 0 }}
      >
        <Loader2 className={`w-5 h-5 text-indigo-500 ${refreshing ? 'animate-spin' : ''}`}
          style={{ opacity: pullY / threshold, transform: `rotate(${(pullY / threshold) * 180}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}