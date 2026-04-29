import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import styles from "./Field.module.css";

export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function Field({ label, error, ...props }, ref) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input className={styles.input} ref={ref} {...props} />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }
>(function TextAreaField({ label, error, ...props }, ref) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <textarea className={styles.textarea} ref={ref} {...props} />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
});
