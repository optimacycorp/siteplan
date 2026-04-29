import { hasSupabaseEnv } from "@/lib/supabase";

import styles from "./Form.module.css";

type AuthServiceNoticeProps = {
  mode?: "warning" | "error";
  message?: string;
};

export function AuthServiceNotice({ message, mode = "warning" }: AuthServiceNoticeProps) {
  if (!message && hasSupabaseEnv) {
    return null;
  }

  const content = message ?? "Supabase environment variables are missing. Sign-in and password recovery will stay unavailable until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.";

  return <div className={mode === "error" ? styles.error : styles.warning}>{content}</div>;
}
