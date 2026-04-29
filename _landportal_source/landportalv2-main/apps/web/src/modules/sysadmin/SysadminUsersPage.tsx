import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/modules/auth/authStore";
import styles from "@/modules/admin/AdminPage.module.css";

import {
  createSysadminUser,
  deleteSysadminUser,
  listSysadminUsers,
  updateSysadminUser,
  type SysadminRole,
  type SysadminUser,
  type SysadminUserInput,
} from "./sysadminUsersApi";

const protectedEmail = "optimacycorp@gmail.com";
const emptyForm: SysadminUserInput = {
  email: "",
  fullName: "",
  password: "",
  role: "reviewer",
  workspaceName: "",
  workspaceSlug: "",
};

function roleLabel(role: SysadminRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function mutationMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function SysadminUsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SysadminUserInput>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");

  const usersQuery = useQuery({
    queryKey: ["sysadmin-users"],
    queryFn: listSysadminUsers,
    enabled: currentUser?.role === "admin",
  });

  const sortedUsers = useMemo(
    () => [...(usersQuery.data ?? [])].sort((left, right) => left.email.localeCompare(right.email)),
    [usersQuery.data],
  );

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["sysadmin-users"] });
  };

  const createMutation = useMutation({
    mutationFn: createSysadminUser,
    onSuccess: async () => {
      setForm(emptyForm);
      setFormOpen(false);
      setStatusMessage("User created.");
      await refreshUsers();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: SysadminUserInput }) => updateSysadminUser(userId, input),
    onSuccess: async () => {
      setEditingUserId(null);
      setForm(emptyForm);
      setFormOpen(false);
      setStatusMessage("User updated.");
      await refreshUsers();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSysadminUser,
    onSuccess: async () => {
      setStatusMessage("User deleted.");
      await refreshUsers();
    },
  });

  const activeMutation = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const activeError = createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? usersQuery.error;

  function beginEdit(user: SysadminUser) {
    setEditingUserId(user.id);
    setFormOpen(true);
    setStatusMessage("");
    setForm({
      email: user.email,
      fullName: user.fullName,
      password: "",
      role: user.role,
      workspaceId: user.workspaceId,
      workspaceName: user.workspaceName,
      workspaceSlug: user.workspaceSlug,
    });
  }

  function resetForm() {
    setEditingUserId(null);
    setFormOpen(false);
    setForm(emptyForm);
    setStatusMessage("");
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");

    if (editingUserId) {
      updateMutation.mutate({ userId: editingUserId, input: form });
      return;
    }

    createMutation.mutate(form);
  }

  function handleDelete(user: SysadminUser) {
    if (user.email.toLowerCase() === protectedEmail) {
      window.alert("optimacycorp@gmail.com is protected and cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(`Delete ${user.email}? This removes their Supabase auth user and workspace profile.`);
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <strong>Sysadmin users</strong>
          <p>Only workspace admins can add, modify, or delete users.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.row}>
          <div>
            <strong>Sysadmin users</strong>
            <p>Add, update, and remove workspace users through a server-side Supabase admin function. The Optimacy owner account is protected from deletion.</p>
          </div>
          <Button
            onClick={() => {
              if (formOpen && !editingUserId) {
                resetForm();
                return;
              }
              setEditingUserId(null);
              setForm(emptyForm);
              setStatusMessage("");
              setFormOpen(true);
            }}
            type="button"
            variant={formOpen && !editingUserId ? "secondary" : "primary"}
          >
            {formOpen && !editingUserId ? "Close form" : "Add user"}
          </Button>
        </div>
      </section>

      {statusMessage || activeError ? (
        <div className={styles.actionRow}>
          {statusMessage ? <span className={`${styles.badge} ${styles.success}`}>{statusMessage}</span> : null}
          {activeError ? <span className={`${styles.badge} ${styles.warn}`}>{mutationMessage(activeError)}</span> : null}
        </div>
      ) : null}

      <section className={styles.layout}>
        {formOpen ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>{editingUserId ? "Edit user" : "Add user"}</strong>
            <span className={styles.muted}>Creates the Supabase Auth user, profile row, and workspace membership.</span>
          </div>

          <form className={styles.formGrid} onSubmit={submitForm}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                autoComplete="email"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className={styles.field}>
              <span>Full name</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
                value={form.fullName}
              />
            </label>

            <label className={styles.field}>
              <span>{editingUserId ? "New password optional" : "Password"}</span>
              <input
                autoComplete={editingUserId ? "new-password" : "current-password"}
                minLength={editingUserId ? undefined : 8}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required={!editingUserId}
                type="password"
                value={form.password ?? ""}
              />
            </label>

            <label className={styles.field}>
              <span>Role</span>
              <select
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as SysadminRole }))}
                value={form.role}
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Workspace name</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, workspaceName: event.target.value }))}
                placeholder="Uses current workspace unless provided"
                value={form.workspaceName ?? ""}
              />
            </label>

            <label className={styles.field}>
              <span>Workspace slug</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, workspaceSlug: event.target.value }))}
                placeholder="optional"
                value={form.workspaceSlug ?? ""}
              />
            </label>

            <div className={styles.actionRow}>
              <Button disabled={activeMutation} type="submit">{editingUserId ? "Save user" : "Create user"}</Button>
              {editingUserId ? <Button disabled={activeMutation} onClick={resetForm} type="button" variant="secondary">Cancel</Button> : null}
            </div>
          </form>
        </div>
        ) : null}

        <div className={styles.panel} style={!formOpen ? { gridColumn: "1 / -1" } : undefined}>
          <div className={styles.panelHeader}>
            <strong>Users</strong>
            <span className={styles.muted}>{sortedUsers.length} user{sortedUsers.length === 1 ? "" : "s"} available to this sysadmin view.</span>
          </div>

          <div className={styles.list}>
            {usersQuery.isLoading ? <span className={styles.muted}>Loading users...</span> : null}
            {sortedUsers.map((user) => (
              <div className={styles.item} key={user.id}>
                <div className={styles.row}>
                  <strong>{user.fullName || user.email}</strong>
                  <span className={`${styles.badge} ${user.role === "admin" ? styles.success : ""}`}>{roleLabel(user.role)}</span>
                </div>
                <span className={styles.muted}>{user.email}</span>
                <span className={styles.muted}>{user.workspaceName} {user.workspaceSlug ? `| ${user.workspaceSlug}` : ""}</span>
                {user.protected ? <span className={`${styles.badge} ${styles.warn}`}>Protected from delete</span> : null}
                <div className={styles.actionRow}>
                  <Button disabled={activeMutation} onClick={() => beginEdit(user)} type="button" variant="secondary">Edit</Button>
                  <Button disabled={activeMutation || user.protected} onClick={() => handleDelete(user)} type="button" variant="ghost">
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
            {!usersQuery.isLoading && !sortedUsers.length ? <span className={styles.muted}>No users found.</span> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
