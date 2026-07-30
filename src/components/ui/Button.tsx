import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "cta";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-6 py-3 font-bold transition-colors",
        variant === "primary" &&
          "bg-green-mid text-white hover:bg-green-dark",
        variant === "secondary" &&
          "border-2 border-blue-mid text-blue-mid hover:bg-blue-light/20",
        variant === "cta" &&
          "bg-yellow-main text-foreground hover:brightness-95",
        className
      )}
      {...props}
    />
  );
}
