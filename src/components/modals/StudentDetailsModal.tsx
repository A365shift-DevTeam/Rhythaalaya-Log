import React from 'react';
import { Student } from '../../types';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onRecordFee: (student?: Student) => void;
  onSendMessage: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen,
  onClose,
  student,
  onRecordFee,
  onSendMessage,
  onDeleteStudent
}) => {
  if (!isOpen || !student) return null;

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#a8ddd0]/40 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#f3faf7] dark:border-[#1e293b] pb-4">
          <div className="flex items-center gap-4">
            {student.avatar ? (
              <img
                src={student.avatar}
                alt={student.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#f3faf7] ring-2 ring-[#45b080]/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#45b080] text-white flex items-center justify-center font-heading font-bold text-2xl">
                {initials}
              </div>
            )}
            <div>
              <h3 className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc]">
                {student.name}
              </h3>
              <p className="font-sans text-xs text-[#565e74] dark:text-[#94a3b8]">
                Student ID: <span className="font-mono font-bold text-[#0b1c30] dark:text-[#f8fafc]">{student.id}</span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-sans text-[11px] bg-[#e8f4ef] text-[#45b080] font-semibold px-2.5 py-0.5 rounded-full">
                  {student.course}
                </span>
                {student.feeStatus === 'Paid' ? (
                  <span className="font-sans text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full">
                    Fee Paid
                  </span>
                ) : (
                  <span className="font-sans text-[11px] bg-rose-100 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full">
                    Fee Pending (${student.feeAmount})
                  </span>
                )}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="text-[#565e74] hover:text-[#0b1c30] p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Student Details Grid */}
        <div className="grid grid-cols-2 gap-4 font-sans text-xs">
          <div className="p-3 bg-[#f3faf7] dark:bg-[#1e293b] rounded-xl">
            <div className="text-[#767586] font-medium mb-1">Batch Schedule</div>
            <div className="font-semibold text-[#0b1c30] dark:text-[#f8fafc]">
              {student.batch}
            </div>
          </div>

          <div className="p-3 bg-[#f3faf7] dark:bg-[#1e293b] rounded-xl">
            <div className="text-[#767586] font-medium mb-1">Overall Attendance</div>
            <div className="font-semibold text-[#0b1c30] dark:text-[#f8fafc] flex items-center gap-2">
              <span className="text-sm">{student.overallAttendance}%</span>
              <div className="flex-1 h-1.5 bg-[#a8ddd0]/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#45b080]"
                  style={{ width: `${student.overallAttendance}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#f3faf7] dark:bg-[#1e293b] rounded-xl">
            <div className="text-[#767586] font-medium mb-1">Phone Contact</div>
            <div className="font-semibold text-[#0b1c30] dark:text-[#f8fafc]">
              {student.phone || '+1 (555) 012-3456'}
            </div>
          </div>

          <div className="p-3 bg-[#f3faf7] dark:bg-[#1e293b] rounded-xl">
            <div className="text-[#767586] font-medium mb-1">Email</div>
            <div className="font-semibold text-[#0b1c30] dark:text-[#f8fafc] truncate">
              {student.email || 'student@example.com'}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#f3faf7] dark:border-[#1e293b]">
          <button
            onClick={() => {
              onClose();
              onSendMessage(student);
            }}
            className="flex-1 py-2 px-3 bg-[#25D366]/10 text-[#1a9f4a] hover:bg-[#25D366]/20 font-sans text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>WhatsApp Msg</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onRecordFee(student);
            }}
            className="btn-brand flex-1 py-2 px-3 font-sans text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Record Fee Payment</span>
          </button>

          <button
            onClick={() => {
              if (confirm(`Are you sure you want to remove ${student.name} from the academy?`)) {
                onDeleteStudent(student.id);
                onClose();
              }
            }}
            className="py-2 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 font-sans text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};
