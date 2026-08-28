import Swal, { type SweetAlertIcon } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export type ConfirmTone = 'default' | 'destructive';

export interface ConfirmActionOptions {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  icon?: SweetAlertIcon;
}

function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/**
 * Themed replacement for `window.confirm`. Resolves to `true` when the user
 * confirms, `false` on cancel / dismiss. Styling lives in `index.css` under
 * the `.swal2-*` and `.swal-theme-*` selectors so it tracks the app's palette.
 */
export async function confirmAction(options: ConfirmActionOptions): Promise<boolean> {
  const {
    title,
    text,
    html,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    tone = 'default',
    icon = tone === 'destructive' ? 'warning' : 'question',
  } = options;

  const result = await Swal.fire({
    title,
    text,
    html,
    icon,
    iconColor: tone === 'destructive' ? '#ef4444' : '#3fc073',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: tone === 'destructive',
    buttonsStyling: false,
    customClass: {
      popup: `swal-theme-popup ${isDarkMode() ? 'swal-theme-dark' : 'swal-theme-light'}`,
      title: 'swal-theme-title',
      htmlContainer: 'swal-theme-body',
      actions: 'swal-theme-actions',
      confirmButton: tone === 'destructive' ? 'swal-theme-confirm swal-theme-confirm-danger' : 'swal-theme-confirm',
      cancelButton: 'swal-theme-cancel',
    },
  });

  return result.isConfirmed;
}
