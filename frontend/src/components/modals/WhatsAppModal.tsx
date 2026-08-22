import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { Dialog } from './Dialog';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student;
  allOverdueStudents?: Student[];
  academyName: string;
}

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const digitsOnly = (phone?: string) => (phone || '').replace(/[^0-9]/g, '');

/** Fills the placeholders the template offers. */
const personalise = (template: string, student: Student) =>
  template
    .replaceAll('{name}', student.name)
    .replaceAll('{amount}', rupees(student.outstandingBalance));

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  student,
  allOverdueStudents = [],
  academyName
}) => {
  const isBulk = !student;
  const recipients = isBulk ? allOverdueStudents : [student];
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setMessage(
      isBulk
        ? `Namaste {name},\n\nA gentle reminder from ${academyName}: {amount} is outstanding on the class fee. Do let us know if you have any questions.\n\nThank you.`
        : `Namaste ${student?.name},\n\nA gentle reminder from ${academyName}: ${rupees(student?.outstandingBalance || 0)} is outstanding on the class fee. Do let us know if you have any questions.\n\nThank you.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student?.id, academyName]);

  const openChat = (target: Student) => {
    const number = digitsOnly(target.phone);
    if (!number) return;
    const text = encodeURIComponent(isBulk ? personalise(message, target) : message);
    window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener');
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const reachable = recipients.filter((item): item is Student => Boolean(item && digitsOnly(item.phone)));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isBulk ? 'Remind everyone who owes' : `Message ${student?.name}`}
      description={
        isBulk
          ? 'WhatsApp opens one chat at a time, so send them one by one from the list.'
          : undefined
      }
      footer={
        isBulk ? (
          <>
            <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
            <button type="button" onClick={copyMessage} className="btn btn-secondary">
              {copied ? 'Copied' : 'Copy message'}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button
              type="button"
              onClick={() => student && openChat(student)}
              disabled={!message.trim() || !digitsOnly(student?.phone)}
              className="btn btn-primary"
            >
              Open WhatsApp
            </button>
          </>
        )
      }
    >
      <div className="space-y-3.5">
        {!isBulk && (
          <p className="label">
            {digitsOnly(student?.phone)
              ? <>Goes to <span className="num text-ink">{student?.phone}</span>.</>
              : 'This student has no phone number on file. Add one on their record first.'}
          </p>
        )}

        <div>
          <label htmlFor="whatsapp-message" className="label mb-1.5 block font-semibold text-ink">
            Message
          </label>
          <textarea
            id="whatsapp-message"
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="field"
          />
          {isBulk && (
            <p className="label-xs mt-1.5">
              <span className="num">{'{name}'}</span> and <span className="num">{'{amount}'}</span> are
              filled in for each student.
            </p>
          )}
        </div>

        {isBulk && (
          <div>
            <p className="label mb-1.5 font-semibold text-ink">
              <span className="num">{reachable.length}</span> of{' '}
              <span className="num">{recipients.length}</span> have a phone number
            </p>

            {recipients.length === 0 ? (
              <div className="empty">
                <p className="text-[13px] font-semibold text-ink">Nobody owes anything</p>
                <p className="label max-w-72">There is no one to remind right now.</p>
              </div>
            ) : (
              <ul className="max-h-56 divide-y divide-line-2 overflow-y-auto rounded-card border border-line">
                {recipients.map((target) => {
                  if (!target) return null;
                  const number = digitsOnly(target.phone);
                  return (
                    <li key={target.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{target.name}</span>
                        <span className="block truncate text-[11px] text-ink-3">
                          {number ? <span className="num">{target.phone}</span> : 'No phone number'}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[13px] font-semibold text-kumkum">
                        {rupees(target.outstandingBalance)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openChat(target)}
                        disabled={!number}
                        className="btn btn-secondary btn-sm shrink-0"
                      >
                        Open
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
