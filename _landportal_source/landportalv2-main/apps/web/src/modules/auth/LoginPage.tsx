import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatAuthErrorMessage } from "@landportal/auth";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { hasSupabaseEnv } from "@/lib/supabase";

import { AuthLayout } from "./AuthLayout";
import { AuthServiceNotice } from "./AuthServiceNotice";
import { loginSchema, type LoginValues } from "./authSchemas";
import { useAuthStore } from "./authStore";
import styles from "./Form.module.css";

type LoginLocationState = {
  from?: string;
  message?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const locationState = location.state as LoginLocationState | null;
  const destination = locationState?.from ?? "/app/projects";
  const successMessage = locationState?.message ?? null;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
      return;
    }

    if (user) {
      navigate(destination, { replace: true });
    }
  }, [destination, initialize, isInitialized, navigate, user]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
      navigate(destination, { replace: true });
    } catch (error) {
      setError("root", {
        message: formatAuthErrorMessage(error, "Unable to sign in"),
      });
    }
  });

  return (
    <AuthLayout
      title="Sign in"
      description="Use your workspace credentials to access projects, presets, and admin tools."
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <AuthServiceNotice />
        {successMessage ? <div className={styles.note}>{successMessage}</div> : null}
        <Field
          label="Email"
          type="email"
          placeholder="name@company.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Field
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />
        {errors.root?.message ? <div className={styles.error}>{errors.root.message}</div> : null}
        <Button fullWidth disabled={isSubmitting || !hasSupabaseEnv} type="submit">
          Enter workspace
        </Button>
        <div className={styles.footer}>
          <span>Secure login is handled through Supabase Auth.</span>
          <Link className={styles.link} to="/auth/reset-password">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
