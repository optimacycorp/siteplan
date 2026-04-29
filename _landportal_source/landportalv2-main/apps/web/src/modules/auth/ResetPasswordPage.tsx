import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { formatAuthErrorMessage } from "@landportal/auth";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

import { resetPasswordRequest, updatePassword } from "./authApi";
import { AuthLayout } from "./AuthLayout";
import { AuthServiceNotice } from "./AuthServiceNotice";
import {
  resetSchema,
  updatePasswordSchema,
  type ResetValues,
  type UpdatePasswordValues,
} from "./authSchemas";
import styles from "./Form.module.css";

function useRecoverySession() {
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkRecovery() {
      if (!hasSupabaseEnv) {
        if (isMounted) {
          setIsChecking(false);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setIsRecoveryReady(Boolean(session));
        setIsChecking(false);
      }
    }

    void checkRecovery();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isChecking, isRecoveryReady };
}

export function ResetPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const { isChecking, isRecoveryReady } = useRecoverySession();
  const requestForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
  });

  const isRecoveryMode = useMemo(() => !isChecking && isRecoveryReady, [isChecking, isRecoveryReady]);

  if (isRecoveryMode) {
    return <UpdatePasswordPage />;
  }

  return (
    <AuthLayout
      title="Reset password"
      description="We’ll send a password reset link through Supabase Auth to the email tied to your workspace access."
    >
      <form
        className={styles.form}
        onSubmit={requestForm.handleSubmit(async (values) => {
          try {
            const { error } = await resetPasswordRequest(values.email);
            if (error) {
              requestForm.setError("root", {
                message: formatAuthErrorMessage(error, "Unable to send reset instructions"),
              });
              return;
            }
            setMessage("If that email exists, reset instructions have been sent.");
          } catch (error) {
            requestForm.setError("root", {
              message: formatAuthErrorMessage(error, "Unable to send reset instructions"),
            });
          }
        })}
      >
        <AuthServiceNotice />
        <Field
          label="Email"
          type="email"
          placeholder="name@company.com"
          error={requestForm.formState.errors.email?.message}
          {...requestForm.register("email")}
        />
        {requestForm.formState.errors.root?.message ? (
          <div className={styles.error}>{requestForm.formState.errors.root.message}</div>
        ) : null}
        <Button fullWidth disabled={requestForm.formState.isSubmitting || !hasSupabaseEnv} type="submit">
          Send reset link
        </Button>
        {message ? <div className={styles.note}>{message}</div> : null}
        <div className={styles.footer}>
          <span>Need to get back in right away?</span>
          <Link className={styles.link} to="/auth/login">
            Return to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const { isChecking, isRecoveryReady } = useRecoverySession();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
  });

  return (
    <AuthLayout
      title="Set a new password"
      description="Finish the Supabase recovery flow by setting a new password for your workspace login."
    >
      <form
        className={styles.form}
        onSubmit={handleSubmit(async (values) => {
          if (!isRecoveryReady) {
            setError("root", {
              message: "Your recovery link is missing or has expired. Request a new password reset email.",
            });
            return;
          }

          try {
            await updatePassword(values.password);
            await supabase.auth.signOut();
            navigate("/auth/login", {
              replace: true,
              state: { message: "Password updated. Sign in with your new password." },
            });
          } catch (error) {
            setError("root", {
              message: formatAuthErrorMessage(error, "Unable to update your password"),
            });
          }
        })}
      >
        <AuthServiceNotice />
        {!isChecking && !isRecoveryReady ? (
          <div className={styles.warning}>
            Open this page from a valid password-recovery email link, or request a new reset email.
          </div>
        ) : null}
        <Field
          label="New password"
          type="password"
          placeholder="Enter a new password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Field
          label="Confirm password"
          type="password"
          placeholder="Confirm the new password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {errors.root?.message ? <div className={styles.error}>{errors.root.message}</div> : null}
        <Button fullWidth disabled={isSubmitting || isChecking || !isRecoveryReady || !hasSupabaseEnv} type="submit">
          Update password
        </Button>
        <div className={styles.footer}>
          <span>Need another recovery email?</span>
          <Link className={styles.link} to="/auth/reset-password">
            Start over
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
