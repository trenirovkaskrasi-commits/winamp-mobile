import React, { useRef, useLayoutEffect } from 'react';

interface WinampTickerProps {
  text: string;
  className?: string;
  paused?: boolean;
}

export function WinampTicker({ text, className = '', paused = false }: WinampTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const checkWidth = () => {
      const cWidth = container.clientWidth;
      const tWidth = textEl.getBoundingClientRect().width;
      
      if (tWidth > cWidth && cWidth > 0) {
        container.classList.add('winamp-ticker-overflowing');
        // Let's use 40px/s speed, minimum string takes a bit of time
        const duration = Math.max((tWidth) / 30, 4);
        container.style.setProperty('--ticker-duration', `${duration}s`);
      } else {
        container.classList.remove('winamp-ticker-overflowing');
        container.style.removeProperty('--ticker-duration');
      }
    };

    checkWidth();

    // Use ResizeObserver to detect layout changes
    const ro = new ResizeObserver(() => checkWidth());
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden whitespace-nowrap w-full ${className}`}
    >
      <div 
        className="winamp-ticker-track flex flex-nowrap w-max relative z-10"
        style={{
          animationPlayState: paused ? 'paused' : 'running'
        }}
      >
        <div className="winamp-ticker-part pr-8 flex whitespace-pre">
          <span ref={textRef}>{text}</span>
        </div>
        <div className="winamp-ticker-part duplicate pr-8 flex whitespace-pre">
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
}
