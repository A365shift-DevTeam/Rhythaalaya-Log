import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  subtext?: string;
  inline?: boolean;
}

const sizeMap = {
  xs: 'h-3.5 w-3.5 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
  xl: 'h-10 w-10 border-4'
};

export function Spinner({
  size = 'md',
  text,
  subtext,
  inline = false,
  className,
  ...props
}: SpinnerProps) {
  const spinnerElement = (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-[#3fc073]/20 border-t-[#3fc073]',
        sizeMap[size]
      )}
      aria-hidden="true"
    />
  );

  if (!text && !subtext) {
    return (
      <div
        role="status"
        className={cn('inline-flex items-center justify-center', className)}
        {...props}
      >
        {spinnerElement}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (inline) {
    return (
      <div
        role="status"
        className={cn('inline-flex items-center gap-2 text-xs text-[#808080] dark:text-[#94a3b8]', className)}
        {...props}
      >
        {spinnerElement}
        {text && <span>{text}</span>}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-2 p-4 text-center', className)}
      {...props}
    >
      {spinnerElement}
      {text && (
        <span className="text-sm font-semibold text-[#212121] dark:text-[#e2e8f0]">
          {text}
        </span>
      )}
      {subtext && (
        <span className="text-xs text-[#808080] dark:text-[#94a3b8]">
          {subtext}
        </span>
      )}
    </div>
  );
}
