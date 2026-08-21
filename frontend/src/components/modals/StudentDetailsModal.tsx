import React from 'react';
import { Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

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
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  if (!isOpen || !student) return null;

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="student-details-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 border-b border-[#f3faf7] dark:border-[#1e293b] pb-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {student.avatar ? (
              <img
                src={student.avatar}
                alt={student.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#f3faf7] ring-2 ring-[#45b080]/10 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#45b080] text-white flex items-center justify-center font-heading font-bold text-xl sm:text-2xl shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h3 id="student-details-title" className="truncate font-heading text-lg sm:text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc]">
                {student.name}
              </h3>
              <p className="font-sans text-xs text-[#565e74] dark:text-[#94a3b8]">
                Student ID: <span className="font-mono font-bold text-[#0b1c30] dark:text-[#f8fafc]">
                  {student.studentNumber || 'Not assigned'}
                </span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="font-sans text-[11px] bg-[#e8f4ef] text-[#45b080] font-semibold px-2.5 py-0.5 rounded-full">
                  {student.course}
                </span>
                {student.feeStatus === 'Paid' ? (
                  <span className="font-sans text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full">
                    Fee Paid
                  </span>
                ) : (
                  <span className="font-sans text-[11px] bg-rose-100 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full">
                    Fee Pending (₹{student.feeAmount.toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>
          </div>

          <button type="button" onClick={onClose} aria-label="Close student details" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#565e74] hover:bg-slate-100 hover:text-[#0b1c30] dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Student Details Grid */}
        <div className="grid grid-cols-1 gap-3 font-sans text-xs sm:grid-cols-2 sm:gap-4">
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
            <div className="text-[#767586] font-medium mb-1">Monthly Fee</div>
            <div className="font-semibold text-[#0b1c30] dark:text-[#f8fafc] tabular-nums">
              ₹{(student.monthlyFee ?? student.feeAmount).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3 bg-[#f3faf7] dark:bg-[#1e293b] rounded-xl">
            <div className="text-[#767586] font-medium mb-1">Enrollment Discount</div>
            <div className={`font-semibold tabular-nums ${student.discountAmount ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#0b1c30] dark:text-[#f8fafc]'}`}>
              {student.discountAmount ? `₹${student.discountAmount.toLocaleString('en-IN')}` : 'No discount'}
            </div>
          </div>

          <div className="p-3 bg-[#f3faf7] dark:bg-[#1e293b] rounded-xl">
            <div className="text-[#767586] font-medium mb-1">Phone Contact</div>
            <div className="font-semibold text-[#0b1c30] dark:text-[#f8fafc]">
              {student.phone || 'Not provided'}
            </div>
          </div>

          <div className="p-3 bg-[#f3faf7] dark:bg-[#1e293b] rounded-xl">
            <div className="text-[#767586] font-medium mb-1">Email</div>
            <div className="font-semibold text-[#0b1c30] dark:text-[#f8fafc] truncate">
              {student.email || 'Not provided'}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[#f3faf7] dark:border-[#1e293b] sm:grid-cols-2">
          <button
            onClick={() => {
              onClose();
              onSendMessage(student);
            }}
            className="min-h-11 py-2 px-3 bg-[#25D366]/10 text-[#13773a] dark:text-emerald-300 hover:bg-[#25D366]/20 font-sans text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>WhatsApp Msg</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onRecordFee(student);
            }}
            className="btn-brand min-h-11 py-2 px-3 font-sans text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
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
            className="min-h-11 py-2 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 font-sans text-xs font-semibold rounded-xl flex items-center justify-center gap-1 sm:col-span-2"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};
