import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';
import { renderWhatsAppTemplate, whatsAppValuesForStudent } from '../../whatsappTemplate';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student;
  allOverdueStudents?: Student[];
  academyName: string;
  template: string;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  student,
  allOverdueStudents = [],
  academyName,
  template
}) => {
  const isBulk = !student;
  const targetList = isBulk ? allOverdueStudents : [student];

  const defaultMsg = student
    ? renderWhatsAppTemplate(template, whatsAppValuesForStudent(student, academyName))
    : `Dear Students / Parents,\nThis is a friendly reminder from ${academyName} that your academy fee is currently due. Please complete the payment at your earliest convenience.\nThank you!`;

  const [message, setMessage] = useState(defaultMsg);
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (isOpen) setMessage(defaultMsg);
    // Re-seed the template whenever the modal opens for a (different) student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student?.id, academyName, template]);

  if (!isOpen) return null;

  const handleSend = () => {
    const encodedMsg = encodeURIComponent(message);
    if (!isBulk && student?.phone) {
      window.open(`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
    } else {
      alert(`WhatsApp reminder broadcast simulated for ${targetList.length} students!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="whatsapp-modal-title" className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="whatsapp-modal-title" className="font-heading text-lg sm:text-xl font-bold text-[#212121] dark:text-white flex items-center gap-2">
            <JisIcon className="text-[#25D366]">forum</JisIcon>
            <span>{isBulk ? 'WhatsApp All Overdue' : `Message ${student?.name}`}</span>
          </h3>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        <div className="space-y-3 font-sans text-sm">
          <p className="text-xs text-[#808080] dark:text-[#94a3b8]">
            {isBulk
              ? `Sending reminder to ${targetList.length} overdue students via WhatsApp template.`
              : `Recipient: ${student?.name} (${student?.phone || 'No phone'})`}
          </p>

          <div>
            <label htmlFor="whatsapp-message" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
              Message Template
            </label>
            <textarea
              id="whatsapp-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white focus:outline-none focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/20 transition-all"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!message.trim() || targetList.length === 0}
              className="min-h-11 px-5 py-2 rounded-2xl text-xs font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 transition-all"
            >
              <JisIcon className="text-[18px]">send</JisIcon>
              <span>Send WhatsApp {isBulk ? `(${targetList.length})` : ''}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
