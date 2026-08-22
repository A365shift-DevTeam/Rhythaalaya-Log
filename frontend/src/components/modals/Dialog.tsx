import React, { useId } from 'react';
import { useDialogLifecycle } from './useDialogLifecycle';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Sticky action row. Put the confirming action last so it sits on the right. */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const WIDTH: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-3xl'
};

/**
 * One dialog shell for the whole app: a bottom sheet on phones, where the
 * thumb is near the bottom of the screen, and a centred card from `sm` up.
 * The header and the action row stay put while the body scrolls, so the
 * confirming button is never scrolled out of reach.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children
}: DialogProps) {
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  const titleId = useId();
  const descriptionId = useId();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card border border-line bg-surface shadow-[var(--shadow-pop)] sm:rounded-card ${WIDTH[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="title">{title}</h2>
            {description && <p id={descriptionId} className="label-xs mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="icon-btn -mr-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[21px]" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">{children}</div>

        {footer && (
          <div
            className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Inline error shown inside a dialog body, above the action row. */
export function DialogError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-ctl border border-kumkum-line bg-kumkum-tint px-3 py-2.5 text-[13px] text-kumkum"
    >
      <span className="material-symbols-outlined mt-px shrink-0 text-[18px]" aria-hidden="true">error</span>
      {message}
    </p>
  );
}
