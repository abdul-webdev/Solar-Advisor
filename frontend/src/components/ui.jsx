import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

/** Success/info modal matching the Figma "Changes saved / Message sent" pattern. */
export function InfoModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h3 className="text-2xl font-bold text-navy">{title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{message}</p>
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">Done</button>
        </div>
      </div>
    </div>
  );
}

/** Destructive confirmation matching the Figma "Delete selected record?" pattern. */
export function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-2xl font-bold text-navy">{title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{message}</p>
        <div className="mt-8 flex items-center justify-between">
          <button onClick={onCancel} className="rounded-lg border border-line bg-white px-6 py-2.5 text-sm font-semibold text-navy hover:bg-appbg">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700">{confirmLabel || 'Delete record'}</button>
        </div>
      </div>
    </div>
  );
}

/** Generic form modal for admin add/edit. */
export function FormModal({ open, title, subtitle, onClose, children, onSubmit, submitLabel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-navy">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-appbg"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="px-6 py-5">{children}</div>
          <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-navy hover:bg-appbg">Cancel</button>
            <button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">{submitLabel || 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-navy placeholder:text-slate-400";
export const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50";
export const btnSecondary = "inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-appbg disabled:opacity-50";
export const btnDanger = "inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700";

export function Badge({ children, tone = 'blue' }) {
  const tones = {
    blue: 'bg-lightblue text-primary',
    green: 'bg-green-50 text-success',
    gray: 'bg-appbg text-muted',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
  };
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, message }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-navy">{title}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
  );
}
