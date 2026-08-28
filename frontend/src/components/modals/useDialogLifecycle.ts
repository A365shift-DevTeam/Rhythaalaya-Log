import { useEffect, useRef } from 'react';

// Dialog lifetimes overlap (a receipt opens while Record fee is still closing, an
// achievement dialog nests inside student details), so each dialog cannot snapshot and
// restore body overflow on its own — the later one would restore the earlier one's
// 'hidden' and lock the page for good. Count the locks instead and only release on the last.
let scrollLockCount = 0;
let overflowBeforeLock = '';

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    overflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = overflowBeforeLock;
  }
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

// Stack of active dialog close handlers so nested dialogs close top-down on Escape.
const activeDialogCloseHandlers: Array<() => void> = [];

export function useDialogLifecycle(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    lockBodyScroll();

    const closeHandler = () => closeRef.current();
    activeDialogCloseHandlers.push(closeHandler);

    const frame = window.requestAnimationFrame(() => {
      const autoFocusField = dialogRef.current?.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
      const formField = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
      );
      const firstField = autoFocusField ?? formField ?? dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstField ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Only the top-most open dialog handles Escape
        if (activeDialogCloseHandlers[activeDialogCloseHandlers.length - 1] === closeHandler) {
          event.preventDefault();
          event.stopPropagation();
          closeRef.current();
        }
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      ) as HTMLElement[];
      const visibleFocusable = focusable.filter((element) => element.offsetParent !== null);
      if (!visibleFocusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = visibleFocusable[0];
      const last = visibleFocusable[visibleFocusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      const index = activeDialogCloseHandlers.lastIndexOf(closeHandler);
      if (index !== -1) {
        activeDialogCloseHandlers.splice(index, 1);
      }
      unlockBodyScroll();
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
