import { useEffect, useRef, type RefObject } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";

import {
  createProjectSchema,
  type CreateProjectValues,
} from "./projectSchemas";
import { useCreateProject } from "./useProjects";
import styles from "./ProjectGrid.module.css";

type CreateProjectModalProps = {
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

export function CreateProjectModal({ initialFocusRef, onClose }: CreateProjectModalProps) {
  const mutation = useCreateProject();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "Colorado Springs, CO",
    },
  });

  useEffect(() => {
    firstFieldRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      initialFocusRef?.current?.focus();
    };
  }, [initialFocusRef, onClose]);

  const nameField = register("name");

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      onClose();
    } catch (error) {
      setError("root", { message: error instanceof Error ? error.message : "Unable to create project" });
    }
  });

  return (
    <div
      className={styles.dialogBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div aria-modal="true" className={styles.dialog} role="dialog">
        <div className={styles.dialogHeader}>
          <h2>Create project</h2>
          <p>Create a backend-backed project in your current workspace.</p>
        </div>
        <form className={styles.dialogForm} onSubmit={onSubmit}>
          <Field
            {...nameField}
            error={errors.name?.message}
            label="Project name"
            ref={(element) => {
              nameField.ref(element);
              firstFieldRef.current = element;
            }}
          />
          <TextAreaField
            label="Description"
            error={errors.description?.message}
            rows={4}
            {...register("description")}
          />
          <Field label="Location" error={errors.location?.message} {...register("location")} />
          {errors.root?.message ? <div className={styles.note}>{errors.root.message}</div> : null}
          <div className={styles.dialogActions}>
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={mutation.isPending} type="submit">
              Create project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
