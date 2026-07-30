import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white shadow-sm border border-black/5 p-6",
        className
      )}
      {...props}
    />
  );
}
