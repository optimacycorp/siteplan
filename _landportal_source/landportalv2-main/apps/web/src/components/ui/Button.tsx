import { forwardRef, type ButtonHTMLAttributes, type PropsWithChildren } from "react";
import clsx from "clsx";

import styles from "./Button.module.css";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    fullWidth?: boolean;
  }
>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    fullWidth = false,
    ...props
  },
  ref,
) {
  return (
    <button
      className={clsx(styles.button, styles[variant], fullWidth && styles.fullWidth, className)}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
