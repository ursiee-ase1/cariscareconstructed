import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { CalendarDays, MapPin, Wallet } from 'lucide-react';
import { CpdRegistrationForm } from '@/components/forms/CpdRegistrationForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { CmsImage } from '@/components/ui/CmsImage';
import { Badge, RichText } from '@/components/ui/Typography';
import { DELIVERY_LABELS, formatDateRange } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { getCpdProgramme, resolvePage } from '@/services/public';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getCpdProgramme((await params).slug);
  if (!p) return {};
  return buildMetadata({ title: p.seo_title || p.title, description: p.seo_description || p.summary, path: `/training/cpd/${p.slug}`, image: p.ogImage ?? p.image });
}

const TextBlock = ({ title, text }: { title: string; text: string | null }) =>
  text ? (
    <section className="mt-10">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-lg leading-relaxed whitespace-pre-line">{text}</p>
    </section>
  ) : null;

export default async function CpdProgrammePage({ params }: Props) {
  const slug = (await params).slug;
  const p = await getCpdProgramme(slug);
  if (!p) {
    // Old addresses under /training/cpd/ (e.g. legacy WordPress pages) may be in the redirect table.
    const r = await resolvePage(`/training/cpd/${slug}`).catch(() => null);
    if (r?.type === 'redirect') {
      if (r.status === 302) redirect(r.to);
      permanentRedirect(r.to);
    }
    notFound();
  }
  const now = new Date();
  const upcoming = p.sessions.filter((s) => new Date(s.starts_at) >= now && s.registration_status !== 'cancelled');
  const past = p.sessions.filter((s) => !upcoming.includes(s));
  const registrable = upcoming.find((s) => s.registration_status === 'open' && s.allow_online_registration);

  return (
    <>
      <PageHeader title={p.title} eyebrow="CPD programme" intro={p.summary} crumbs={[{ label: 'Training', href: '/training' }, { label: 'CPDs', href: '/training/cpd' }, { label: p.title }]} />
      <div className="container-site grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="max-w-3xl">
          {p.image && <CmsImage media={p.image} slot="training" rounded className="mb-8" priority fit="contain" sizes="(min-width:1024px) 48rem, 100vw" />}
          <RichText html={p.description} />
          <TextBlock title="Who should attend" text={p.target_audience} />
          <TextBlock title="What you will learn" text={p.learning_objectives} />
          <TextBlock title="Facilitators" text={p.facilitators} />

          {registrable && (
            <section aria-labelledby="register-heading" id="register" className="mt-12 rounded-(--radius-card) border border-line bg-surface p-6 md:p-8">
              <h2 id="register-heading" className="text-2xl font-bold">
                Register for {formatDateRange(registrable.starts_at, registrable.ends_at)}
              </h2>
              <p className="mt-2 mb-6 text-muted">Submit your details and the CARISCA team will confirm your place.</p>
              <CpdRegistrationForm sessionId={registrable.id} hybrid={registrable.delivery_mode === 'hybrid'} />
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-(--radius-card) border border-line bg-surface p-5">
            <h2 className="font-display text-lg font-bold">{upcoming.length ? 'Upcoming sessions' : 'Sessions'}</h2>
            {upcoming.length === 0 && <p className="mt-2 text-muted">No upcoming sessions are scheduled.</p>}
            <ul className="mt-3 space-y-4">
              {[...upcoming, ...past].map((s) => {
                const isPast = !upcoming.includes(s);
                return (
                  <li key={s.id} className={`border-t border-line pt-4 first:border-0 first:pt-0 ${isPast ? 'opacity-80' : ''}`}>
                    <p className="flex gap-2 font-medium text-ink">
                      <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      {formatDateRange(s.starts_at, s.ends_at)}
                    </p>
                    {s.venue && (
                      <p className="mt-1 flex gap-2 text-sm text-muted">
                        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" /> {s.venue}
                      </p>
                    )}
                    {s.fee_text && (
                      <p className="mt-1 flex gap-2 text-sm text-muted">
                        <Wallet aria-hidden className="mt-0.5 size-4 shrink-0" /> {s.fee_text}
                      </p>
                    )}
                    <p className="mt-2 flex flex-wrap gap-2">
                      <Badge tone="neutral">{DELIVERY_LABELS[s.delivery_mode]}</Badge>
                      <Badge tone={isPast ? 'neutral' : s.registration_status === 'open' ? 'success' : 'gold'}>
                        {isPast ? 'Completed' : s.registration_status === 'open' ? 'Registration open' : s.registration_status}
                      </Badge>
                    </p>
                    {!isPast && s.registration_status === 'open' && s.registration_url && !s.allow_online_registration && (
                      <ButtonLink href={s.registration_url} size="sm" className="mt-3">
                        Register on the events portal
                      </ButtonLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <dl className="space-y-3 rounded-(--radius-card) border border-line p-5 text-[0.95rem]">
            {[
              ['Duration', p.duration],
              ['Format', p.delivery_format],
              ['Fee', p.fee_text],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm font-semibold text-muted">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
          </dl>
          {upcoming.length > 0 && !registrable && p.registration_url && (
            <ButtonLink href={p.registration_url} className="w-full" size="lg">
              Register
            </ButtonLink>
          )}
        </aside>
      </div>
    </>
  );
}
