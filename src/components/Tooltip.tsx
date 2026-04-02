import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.top < 120) setPosition('bottom');
      else setPosition('top');
    }
  }, [show]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || (
        <svg className="w-4 h-4 text-exp-gray-400 hover:text-exp-gray-600 cursor-help ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
      {show && (
        <span
          className={`absolute z-50 px-3 py-2 text-xs leading-relaxed text-white bg-exp-black rounded-md shadow-lg whitespace-normal w-64 pointer-events-none ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-1/2 -translate-x-1/2`}
        >
          {content}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent ${
              position === 'top'
                ? 'top-full border-t-exp-black'
                : 'bottom-full border-b-exp-black'
            }`}
          />
        </span>
      )}
    </span>
  );
}
