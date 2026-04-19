import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";

type MaybeClass = string | false | null | undefined;

function cx(...classes: MaybeClass[]) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariantMap: Record<ButtonVariant, string> = {
  // Swiss primary — solid ink, sharp corners, vermillion on hover.
  primary:
    "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)]",
  // Secondary — outline only, inverts on hover.
  secondary:
    "border border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]",
  // Ghost — quiet outline, accent on hover.
  ghost:
    "border border-[var(--rule)] bg-transparent text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  danger:
    "bg-[var(--accent)] text-[var(--paper)] hover:bg-[var(--accent-hover)] disabled:hover:bg-[var(--accent)]",
};

const buttonSizeMap: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cx(
    // Sharp corners + Swiss-neutral tracking.
    "inline-flex items-center justify-center gap-2 rounded-[2px] font-semibold tracking-[0.02em]",
    "transition-colors duration-150",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    buttonVariantMap[variant],
    buttonSizeMap[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...props} />
  );
}

export function inputClasses({ className }: { className?: string } = {}) {
  return cx(
    // Swiss input — sharp corners, ink border, paper fill.
    "w-full rounded-[2px] px-4 py-3.5 text-base",
    "bg-[var(--paper)]",
    "border-[1.5px] border-[var(--ink)]",
    "text-[var(--ink)]",
    "placeholder:text-[var(--muted-2)]",
    "outline-none",
    "transition-colors duration-150",
    "focus:border-[var(--accent)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    className
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClasses({ className })} {...props} />;
}

export function cardClasses({
  strong,
  className,
}: {
  strong?: boolean;
  className?: string;
} = {}) {
  return cx(strong ? "card-surface-strong" : "card-surface", className);
}

export function Card({
  strong,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return <div className={cardClasses({ strong, className })} {...props} />;
}

type BadgeTone = "neutral" | "info" | "success";

const badgeToneMap: Record<BadgeTone, string> = {
  neutral: "border border-[var(--rule)] text-[var(--muted)]",
  info: "border border-[var(--accent)] text-[var(--accent)]",
  success: "border border-emerald-600 text-emerald-700 dark:text-emerald-400",
};

export function badgeClasses({
  tone = "neutral",
  className,
}: {
  tone?: BadgeTone;
  className?: string;
} = {}) {
  return cx(
    // Mono tag — sharp rectangle, uppercase, tracked.
    "inline-flex items-center rounded-[2px] px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
    badgeToneMap[tone],
    className
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={badgeClasses({ tone, className })} {...props} />;
}
