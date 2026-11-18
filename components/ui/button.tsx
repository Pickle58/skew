import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "text";
type ButtonAppearance = "solid" | "outline";
type ButtonPresentation = "default" | "hover";
type ButtonSize = "default" | "header";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  appearance?: ButtonAppearance;
  presentation?: ButtonPresentation;
  size?: ButtonSize;
};

const solid: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-ink text-white",
  secondary: "border border-line bg-panel text-ink",
  text: "border border-transparent bg-transparent text-ink",
};

const hover: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-ink text-white",
  secondary: "border border-line bg-panel-muted text-ink",
  text: "border border-transparent bg-transparent text-bias-right",
};

const outline: Record<Exclude<ButtonVariant, "text">, string> = {
  primary: "border border-ink bg-panel text-ink",
  secondary: "border border-line bg-panel text-ink",
};

export function Button({
  variant = "primary",
  appearance = "solid",
  presentation = "default",
  size = "default",
  className = "",
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const shape =
    size === "header"
      ? "h-9 px-3.5 text-[14px]"
      : variant === "text"
        ? "h-7 px-1 text-[13px]"
        : "h-7 px-2.5 text-[13px]";

  let look = solid[variant];
  if (disabled) {
    look = "border border-transparent bg-panel-muted text-muted";
  } else if (appearance === "outline" && variant !== "text") {
    look = outline[variant];
  } else if (presentation === "hover") {
    look = hover[variant];
  }

  const interactive =
    disabled || presentation === "hover"
      ? ""
      : variant === "text"
        ? "hover:text-bias-right"
        : variant === "secondary" && appearance === "solid"
          ? "hover:bg-panel-muted"
          : "";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full font-medium leading-none ${shape} ${look} ${interactive} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
