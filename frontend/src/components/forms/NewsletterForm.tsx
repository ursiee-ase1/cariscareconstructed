'use client';

import { useId } from 'react';
import { usePublicForm } from '@/hooks/usePublicForm';
import { Checkbox, FormStatus, Honeypot } from './FormFields';

/** Newsletter sign-up with explicit consent. Duplicate sign-ups are handled by the API. */
export function NewsletterForm({ variant = 'dark', source = 'footer' }: { variant?: 'dark' | 'light'; source?: string }) {
  const id = useId();
  const form = usePublicForm('/subscribers', { email: '', consent: false });
  const dark = variant === 'dark';

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ source });
      }}
      className="relative space-y-3"
    >
      <Honeypot value={form.honeypot} onChange={form.setHoneypot} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          value={form.values.email}
          onChange={(e) => form.set('email', e.target.value)}
          aria-invalid={form.errors.email ? true : undefined}
          aria-describedby={form.errors.email ? `${id}-email-error` : undefined}
          className={`h-12 flex-1 rounded-(--radius-control) border px-4 text-base outline-none focus:ring-3 ${
            dark ? 'border-white/30 bg-white text-ink focus:ring-sky-accent/50' : 'border-line bg-white text-ink focus:ring-brand-100'
          }`}
        />
        <button
          type="submit"
          disabled={form.submitting}
          className={`h-12 rounded-(--radius-control) px-6 font-display font-bold tracking-wide disabled:opacity-60 ${
            dark ? 'bg-sky-accent text-brand-950 hover:bg-sky-accent-strong' : 'bg-brand-700 text-white hover:bg-brand-800'
          }`}
        >
          {form.submitting ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      {form.errors.email && (
        <p id={`${id}-email-error`} className={`text-sm font-medium ${dark ? 'text-[#ffd4cf]' : 'text-danger'}`}>
          {form.errors.email}
        </p>
      )}
      <div className={dark ? '[&_label]:text-brand-100' : ''}>
        <Checkbox
          id={`${id}-consent`}
          checked={Boolean(form.values.consent)}
          onChange={(e) => form.set('consent', e.target.checked)}
          error={form.errors.consent}
          label="I agree to receive the CARISCA newsletter and updates by email. I can unsubscribe at any time."
        />
      </div>
      <FormStatus status={form.status} />
    </form>
  );
}
