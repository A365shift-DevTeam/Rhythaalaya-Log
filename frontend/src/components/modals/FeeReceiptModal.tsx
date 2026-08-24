import React from 'react';
import { PAYMENT_METHOD_LABELS, Receipt } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

export function FeeReceiptModal({ isOpen, onClose, receipt }: { isOpen: boolean; onClose: () => void; receipt: Receipt | null }) {
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  if (!isOpen || !receipt) return null;
  const date = new Date(receipt.paymentDate);

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fee-receipt-title" className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#f0f0f0] p-3 shadow-2xl dark:bg-[#07111f] sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <div>
          <h2 id="fee-receipt-title" className="text-base font-bold text-[#212121] dark:text-white">Payment receipt</h2>
          <p className="text-xs text-[#808080]">Ready to print or save as PDF</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close receipt" title="Close" className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
          <span className="material-symbols-outlined text-[19px]">close</span>
        </button>
      </div>

      <article className="fee-receipt-print rounded-3xl border border-[#dbdbdb] bg-white p-5 text-[#212121] shadow-sm sm:p-7 dark:border-[#243244] dark:bg-[#0b1422] dark:text-white">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-[#dbdbdb] pb-5 dark:border-[#243244]">
          <div className="flex min-w-0 items-center gap-3">
            {receipt.showLogo && <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-lg font-bold text-white shadow-xs">{receipt.organizationLogoUrl ? <img src={receipt.organizationLogoUrl} alt={receipt.organizationName} className="h-full w-full object-cover" /> : receipt.organizationName.charAt(0)}</div>}
            <div className="min-w-0"><h3 className="truncate text-base font-bold text-[#212121] dark:text-white">{receipt.organizationName}</h3><p className="mt-0.5 text-xs leading-5 text-[#808080] dark:text-[#94a3b8]">{receipt.organizationAddress}{receipt.organizationPhone && <><br />{receipt.organizationPhone}</>}{receipt.organizationEmail && <><br />{receipt.organizationEmail}</>}</p></div>
          </div>
          <div className="text-right"><div className="text-xs font-bold uppercase tracking-widest text-[#3fc073]">Fee receipt</div><div className="mt-1 font-mono text-xs font-bold text-[#212121] dark:text-white">{receipt.receiptNumber}</div></div>
        </header>
        <div className="grid grid-cols-2 gap-4 border-b border-dashed border-[#dbdbdb] py-5 text-xs sm:grid-cols-3 dark:border-[#243244]">
          <ReceiptDetail label="Student" value={receipt.studentName} /><ReceiptDetail label="Student ID" value={receipt.studentNumber} />
          <ReceiptDetail label="Course" value={receipt.courseName} /><ReceiptDetail label="Batch" value={receipt.batchName} />
          <ReceiptDetail label="Payment date" value={date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <ReceiptDetail label="Payment method" value={PAYMENT_METHOD_LABELS[receipt.method]} />
          <ReceiptDetail label="Collected by" value={receipt.collectedByName} />
          <ReceiptDetail label="Status" value={receipt.amount < 0 ? 'Refunded' : 'Paid'} tone="success" />
        </div>
        <div className="my-5 flex items-end justify-between rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 px-4 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#b3e6c7]">{receipt.amount < 0 ? 'Amount refunded' : 'Amount received'}</p><p className="mt-1 text-xs text-[#575757] dark:text-[#cbecd8]">Fee payment</p></div><p className="text-2xl font-bold tabular-nums text-[#35a160] dark:text-[#b3e6c7]">₹{Math.abs(receipt.amount).toLocaleString('en-IN')}</p></div>
        <footer className="pt-2 text-center"><p className="text-xs text-[#808080]">{receipt.receiptFooter}</p>{receipt.showSignature && <div className="ml-auto mt-10 w-36 border-t border-[#dbdbdb] dark:border-[#334155] pt-1 text-xs text-[#808080]">Authorized signature</div>}</footer>
      </article>
      <div className="mt-3 grid grid-cols-2 gap-2 print:hidden"><button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-[#dbdbdb] bg-white px-4 text-xs font-bold text-[#575757] hover:bg-[#f0f0f0] dark:border-[#243244] dark:bg-[#0b1422] dark:text-white">Close</button><button type="button" onClick={() => window.print()} className="btn-brand min-h-11 rounded-2xl px-4 text-xs font-bold"><span className="material-symbols-outlined mr-1 align-middle text-[18px]">print</span>Print receipt</button></div>
    </div>
  </div>;
}

function ReceiptDetail({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return <div><div className="text-xs font-bold uppercase tracking-wider text-[#9e9e9e]">{label}</div><div className={`mt-1 font-bold ${tone === 'success' ? 'text-[#22c55e]' : 'text-[#212121] dark:text-white'}`}>{value}</div></div>;
}
