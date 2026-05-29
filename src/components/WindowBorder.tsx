import React from 'react';

export function WindowBorder({ title, children, className = '', titleClassName = 'text-[#a1a1aa]', onClose }: { title: string, children: React.ReactNode, className?: string, titleClassName?: string, onClose?: () => void }) {
  return (
    <div className={`winamp-panel flex flex-col p-[6px] relative shadow-2xl ${className}`}>
      {/* Title Bar */}
      <div className="h-6 sm:h-8 flex items-center justify-between px-2 mb-2 winamp-inner-panel">
        <div className="flex items-center gap-2 w-1/4">
          <div className="w-[12px] h-[12px] rounded-full bg-[#0a0a0c] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.9),_0_1px_0_rgba(255,255,255,0.06)] border border-[#111] flex items-center justify-center relative overflow-hidden">
             <div className="w-[8px] h-[1px] bg-[#1a1a1f] shadow-[0_1px_0_rgba(255,255,255,0.02)] absolute rotate-45 transform origin-center"></div>
          </div>
          {/* Decorative lines left */}
          <div className="flex-col gap-[4px] hidden sm:flex flex-1 mx-1 opacity-50">
             <div className="h-[2px] bg-[#000] shadow-[0_1px_0_rgba(255,255,255,0.1)] w-full rounded-full"></div>
             <div className="h-[2px] bg-[#000] shadow-[0_1px_0_rgba(255,255,255,0.1)] w-full rounded-full"></div>
          </div>
        </div>
        
        <div className={`font-sans text-xs sm:text-sm font-bold tracking-[0.1em] px-2 whitespace-nowrap ${titleClassName}`} style={{ textShadow: '0 -1px 0 rgba(0,0,0,0.8)' }}>
          {title}
        </div>
        
        <div className="flex items-center justify-end gap-2 w-1/4">
          {/* Decorative lines right */}
          <div className="flex-col gap-[4px] hidden sm:flex flex-1 mx-1 opacity-50">
             <div className="h-[2px] bg-[#000] shadow-[0_1px_0_rgba(255,255,255,0.1)] w-full rounded-full"></div>
             <div className="h-[2px] bg-[#000] shadow-[0_1px_0_rgba(255,255,255,0.1)] w-full rounded-full"></div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="winamp-btn w-3.5 h-3.5 sm:w-4 sm:h-4 p-0 flex items-center justify-center font-bold text-[9px] sm:text-[10px] leading-none mb-0.5 ml-1 flex-shrink-0"
              style={{ minHeight: 'unset', minWidth: 'unset', padding: 0 }}
            >
              X
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col relative bg-[#151518]/60 rounded p-[2px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] border border-[#111]">
        {children}
      </div>
    </div>
  );
}
