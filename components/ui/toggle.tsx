"use client";
import * as React from "react";
import { clsx } from "clsx";

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
}

export function Toggle({ pressed = false, className, ...props }: ToggleProps) {
  return (
    <button
      aria-pressed={pressed}
      className={clsx(
        "inline-flex items-center justify-center rounded-md border border-input px-3 py-2 text-sm transition-colors",
        pressed ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
        className
      )}
      {...props}
    />
  );
}


