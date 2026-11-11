import type { ComponentProps, ReactNode } from 'react';

/** Accessible form field primitives: labels, hints and errors are wired with aria attributes. */

const inputBase =
  'block w-full rounded-(--radius-control) border bg-white px-3.5 py-2.5 text-base text-ink shadow-xs outline-none transition placeholder:text-muted/70 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 disabled:bg-surface';

export function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-display text-[0.95rem] font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

export function TextInput({ id, error, hint, className = '', ...props }: ComponentProps<'input'> & { id: string; error?: string; hint?: string }) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${inputBase} ${error ? 'border-danger' : 'border-line'} ${className}`}
      {...props}
    />
  );
}

export function TextArea({ id, error, hint, className = '', ...props }: ComponentProps<'textarea'> & { id: string; error?: string; hint?: string }) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${inputBase} min-h-36 ${error ? 'border-danger' : 'border-line'} ${className}`}
      {...props}
    />
  );
}

export function Select({ id, error, hint, className = '', children, ...props }: ComponentProps<'select'> & { id: string; error?: string; hint?: string }) {
  return (
    <select
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${inputBase} ${error ? 'border-danger' : 'border-line'} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ id, label, error, ...props }: ComponentProps<'input'> & { id: string; label: ReactNode; error?: string }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 size-4.5 shrink-0 rounded border-line accent-brand-700"
          {...props}
        />
        <label htmlFor={id} className="text-[0.95rem] text-body">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hidden honeypot field. Real visitors never see or fill it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

export function FormStatus({ status }: { status: { kind: 'success' | 'error'; message: string } | null }) {
  return (
    <div role="status" aria-live="polite" className="min-h-0">
      {status && (
        <p
          className={`rounded-(--radius-card) border px-4 py-3 text-[0.95rem] font-medium ${
            status.kind === 'success' ? 'border-[#c3e6d4] bg-[#eef8f3] text-success' : 'border-[#f6c9c4] bg-[#fdf0ee] text-danger'
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
