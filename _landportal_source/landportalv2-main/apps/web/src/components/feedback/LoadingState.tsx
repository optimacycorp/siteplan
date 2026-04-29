import styles from "./LoadingState.module.css";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>{message}</div>
    </div>
  );
}
