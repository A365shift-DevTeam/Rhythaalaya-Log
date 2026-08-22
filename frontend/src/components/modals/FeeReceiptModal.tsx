import React from 'react';
import { PAYMENT_METHOD_LABELS, Receipt } from '../../types';
import { Dialog } from './Dialog';

export function FeeReceiptModal({
  isOpen,
  onClose,
  receipt
}: {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
}) {
  if (!receipt) return null;

  const refunded = receipt.amount < 0;
  const paidOn = new Date(receipt.paymentDate);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Receipt"
      description="Print it, or save it as a PDF from the print dialog."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
          <button type="button" onClick={() => window.print()} className="btn btn-primary">
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">print</span>
            Print
          </button>
        </>
      }
    >
      {/* Only this article survives the print stylesheet. */}
      <article className="fee-receipt-print card p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-line pb-4">
          <div className="flex min-w-0 items-center gap-3">
            {receipt.showLogo && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-ctl bg-leaf text-[15px] font-semibold text-leaf-on">
                {receipt.organizationLogoUrl
                  ? <img src={receipt.organizationLogoUrl} alt="" className="h-full w-full object-cover" />
                  : receipt.organizationName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="title block truncate">{receipt.organizationName}</span>
              <span className="label-xs mt-0.5 block leading-[1.5]">
                {receipt.organizationAddress}
                {receipt.organizationPhone && <><br />{receipt.organizationPhone}</>}
                {receipt.organizationEmail && <><br />{receipt.organizationEmail}</>}
              </span>
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="label-xs block">{refunded ? 'Refund' : 'Fee receipt'}</span>
            <span className="num mt-0.5 block text-[13px] font-semibold text-ink">{receipt.receiptNumber}</span>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-dashed border-line py-4 sm:grid-cols-3">
          <Line label="Student" value={receipt.studentName} />
          <Line label="Student ID" value={receipt.studentNumber} mono />
          <Line label="Course" value={receipt.courseName} />
          <Line label="Batch" value={receipt.batchName} />
          <Line
            label="Paid on"
            value={paidOn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            mono
          />
          <Line label="Paid by" value={PAYMENT_METHOD_LABELS[receipt.method]} />
          <Line label="Received by" value={receipt.collectedByName} />
        </dl>

        <div className="my-4 flex items-end justify-between gap-4 rounded-card bg-surface-2 px-4 py-3.5">
          <span className="label">{refunded ? 'Amount refunded' : 'Amount received'}</span>
          <span className={`num-lg ${refunded ? 'text-kumkum' : 'text-leaf-strong'}`}>
            ₹{Math.abs(receipt.amount).toLocaleString('en-IN')}
          </span>
        </div>

        <footer className="text-center">
          <p className="label">{receipt.receiptFooter}</p>
          {receipt.showSignature && (
            <div className="ml-auto mt-10 w-36 border-t border-line pt-1">
              <span className="label-xs">Authorised signature</span>
            </div>
          )}
        </footer>
      </article>
    </Dialog>
  );
}

function Line({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label-xs">{label}</dt>
      <dd className={`mt-0.5 truncate text-[13px] font-medium text-ink ${mono ? 'num' : ''}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
