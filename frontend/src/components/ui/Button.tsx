import type { ComponentProps, ReactNode } from 'react';
import { SmartLink } from './SmartLink';

type Variant = 'primary' | 'secondary' | 'ghost' | 'light' | 'outline-light';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary: 'border border-brand-700 bg-white text-brand-700 hover:bg-brand-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  light: 'bg-white text-brand-900 hover:bg-brand-50',
  'outline-light': 'border border-white/70 text-white hover:bg-white/10',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-12 px-6 text-base',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-(--radius-control) font-display font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

export function ButtonLink({
  href,
  children,
  variant,
  size,
  className = '',
  newTab,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  newTab?: boolean;
}) {
  return (
    <SmartLink href={href} newTab={newTab} className={buttonClass(variant, size, className)}>
      {children}
    </SmartLink>
  );
}

export function Button({ variant, size, className = '', ...props }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
