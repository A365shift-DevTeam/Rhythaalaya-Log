import React from 'react';
import { PAYMENT_METHOD_LABELS, Receipt } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

export function FeeReceiptModal({ isOpen, onClose, receipt }: { isOpen: boolean; onClose: () => void; receipt: Receipt | null }) {
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  if (!isOpen || !receipt) return null;
  const date = new Date(receipt.paymentDate);

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fee-receipt-title" className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-100 p-3 shadow-2xl dark:bg-slate-950 sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex items-center justify-between print:hidden"><div><h2 id="fee-receipt-title" className="text-base font-extrabold text-slate-900 dark:text-white">Payment receipt</h2><p className="text-xs text-slate-500">Ready to print or save as PDF</p></div>
        <button type="button" onClick={onClose} aria-label="Close receipt" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white dark:hover:bg-slate-800"><span className="material-symbols-outlined">close</span></button></div>

      <article className="fee-receipt-print rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-7">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-slate-300 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            {receipt.showLogo && <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-500 text-lg font-extrabold text-white">{receipt.organizationLogoUrl ? <img src={receipt.organizationLogoUrl} alt={receipt.organizationName} className="h-full w-full object-cover" /> : receipt.organizationName.charAt(0)}</div>}
            <div className="min-w-0"><h3 className="truncate text-base font-extrabold">{receipt.organizationName}</h3><p className="mt-0.5 text-[11px] leading-5 text-slate-500">{receipt.organizationAddress}{receipt.organizationPhone && <><br />{receipt.organizationPhone}</>}{receipt.organizationEmail && <><br />{receipt.organizationEmail}</>}</p></div>
          </div>
          <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Fee receipt</div><div className="mt-1 font-mono text-xs font-bold">{receipt.receiptNumber}</div></div>
        </header>
        <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-300 py-5 text-xs sm:grid-cols-3">
          <ReceiptDetail label="Student" value={receipt.studentName} /><ReceiptDetail label="Student ID" value={receipt.studentNumber} />
          <ReceiptDetail label="Course" value={receipt.courseName} /><ReceiptDetail label="Batch" value={receipt.batchName} />
          <ReceiptDetail label="Payment date" value={date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <ReceiptDetail label="Payment method" value={PAYMENT_METHOD_LABELS[receipt.method]} />
          <ReceiptDetail label="Collected by" value={receipt.collectedByName} />
          <ReceiptDetail label="Status" value={receipt.amount < 0 ? 'Refunded' : 'Paid'} tone="success" />
        </div>
        <div className="my-5 flex items-end justify-between rounded-xl bg-brand-50 px-4 py-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{receipt.amount < 0 ? 'Amount refunded' : 'Amount received'}</p><p className="mt-1 text-xs text-slate-500">Fee payment</p></div><p className="text-2xl font-extrabold tabular-nums text-brand-700">₹{Math.abs(receipt.amount).toLocaleString('en-IN')}</p></div>
        <footer className="pt-2 text-center"><p className="text-xs text-slate-500">{receipt.receiptFooter}</p>{receipt.showSignature && <div className="ml-auto mt-10 w-36 border-t border-slate-400 pt-1 text-[10px] text-slate-500">Authorized signature</div>}</footer>
      </article>
      <div className="mt-3 grid grid-cols-2 gap-2 print:hidden"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white">Close</button><button type="button" onClick={() => window.print()} className="btn-brand min-h-11 rounded-xl px-4 text-xs font-bold"><span className="material-symbols-outlined mr-1 align-middle text-[18px]">print</span>Print receipt</button></div>
    </div>
  </div>;
}

function ReceiptDetail({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className={`mt-1 font-bold ${tone === 'success' ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</div></div>;
}
