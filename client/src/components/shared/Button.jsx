import { cn } from "../../lib/cn";

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...props
}) {
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline:
      "border border-slate-200 bg-white text-slate-900 hover:border-brand-500 hover:text-brand-600",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
