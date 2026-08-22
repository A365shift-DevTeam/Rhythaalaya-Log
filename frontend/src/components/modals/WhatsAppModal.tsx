import React, { useState } from 'react';
import { Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student;
  allOverdueStudents?: Student[];
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  student,
  allOverdueStudents = []
}) => {
  const isBulk = !student;
  const targetList = isBulk ? allOverdueStudents : [student];

  const defaultMsg = isBulk
    ? `Dear Students / Parents,\nThis is a friendly reminder from Rhythaalaya that your academy fee is currently due. Please complete the payment at your earliest convenience.\nThank you!`
    : `Hi ${student?.name},\nThis is a friendly reminder from Rhythaalaya regarding your outstanding fee of ₹${student?.outstandingBalance || 0}. Please let us know if you have any questions!\nThank you.`;

  const [message, setMessage] = useState(defaultMsg);
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  if (!isOpen) return null;

  const handleSend = () => {
    // Open whatsapp web / tel link or display sent confirmation
    const encodedMsg = encodeURIComponent(message);
    if (!isBulk && student?.phone) {
      window.open(`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
    } else {
      alert(`WhatsApp reminder broadcast simulated for ${targetList.length} students!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="whatsapp-modal-title" className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-4">
        {/* Floating Close Button */}
        <div className="sticky top-0 z-30 flex justify-end pointer-events-none -mb-10 sm:-mb-12">
          <div className="pointer-events-auto flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80">
            <button type="button" onClick={onClose} aria-label="Close WhatsApp message" title="Close"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-[#f3faf7] dark:border-[#1e293b] pb-3 pt-1">
          <h3 id="whatsapp-modal-title" className="font-heading text-lg sm:text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc] flex items-center gap-2 pr-12">
            <span className="material-symbols-outlined text-[#25D366]">forum</span>
            <span>{isBulk ? 'WhatsApp All Overdue' : `Message ${student?.name}`}</span>
          </h3>
        </div>

        <div className="space-y-3 font-sans text-sm">
          <p className="text-xs text-[#565e74] dark:text-[#94a3b8]">
            {isBulk
              ? `Sending reminder to ${targetList.length} overdue students via WhatsApp template.`
              : `Recipient: ${student?.name} (${student?.phone || 'No phone'})`}
          </p>

          <div>
            <label htmlFor="whatsapp-message" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Message Template
            </label>
            <textarea
              id="whatsapp-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-sm text-[#0b1c30] dark:text-[#f8fafc] focus:outline-none focus:border-[#25D366]"
            ></textarea>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-[#565e74] hover:bg-[#f3faf7]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim() || targetList.length === 0}
              className="min-h-11 px-5 py-2 rounded-xl text-xs font-bold bg-[#128C4A] text-white hover:bg-[#0f783f] shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Send WhatsApp {isBulk ? `(${targetList.length})` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
