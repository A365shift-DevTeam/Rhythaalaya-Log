import React, { useState } from 'react';
import { Student } from '../../types';

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
    ? `Dear Students / Parents,\nThis is a friendly reminder from StudioSync that your academy fee for this month is currently due. Please complete the payment at your earliest convenience.\nThank you!`
    : `Hi ${student?.name},\nThis is a friendly reminder from StudioSync regarding your monthly fee of $${student?.feeAmount || 150}. It is currently overdue by ${student?.overdueDays || 3} days. Please let us know if you have any questions!\nThank you.`;

  const [message, setMessage] = useState(defaultMsg);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c7c4d7]/40 space-y-4">
        <div className="flex justify-between items-center border-b border-[#eff4ff] dark:border-[#1e293b] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#25D366]">forum</span>
            <span>{isBulk ? 'WhatsApp All Overdue' : `Message ${student?.name}`}</span>
          </h3>
          <button onClick={onClose} className="text-[#565e74] hover:text-[#0b1c30] p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3 font-sans text-sm">
          <p className="text-xs text-[#565e74] dark:text-[#94a3b8]">
            {isBulk
              ? `Sending reminder to ${targetList.length} overdue students via WhatsApp template.`
              : `Recipient: ${student?.name} (${student?.phone || 'No phone'})`}
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Message Template
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-[#f8f9ff] dark:bg-[#1e293b] border border-[#c7c4d7] rounded-xl text-xs text-[#0b1c30] dark:text-[#f8fafc] focus:outline-none focus:border-[#25D366]"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#565e74] hover:bg-[#eff4ff]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:bg-[#1fba57] shadow-sm flex items-center gap-2"
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
