import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90 border-transparent font-semibold",
  secondary: "bg-surface text-fg border-line hover:bg-hover hover:border-line-strong",
  ghost: "bg-transparent text-fg-2 border-transparent hover:bg-hover hover:text-fg",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-lg border font-medium transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
