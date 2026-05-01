import type { ReactNode } from "react";

type InlineNoticeProps = {
  tone?: "info" | "success" | "warning";
  children: ReactNode;
};

export function InlineNotice({ tone = "info", children }: InlineNoticeProps) {
  return <p className={`inline-notice inline-notice-${tone}`}>{children}</p>;
}
