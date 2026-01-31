import { auth } from "@clerk/nextjs/server";
import AdminUsersClient from "./AdminUsersClient";
import { isAdminRole, UserRole } from "../lib/roles";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default async function AdminPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-800">Manage Users</h1>
          <p className="mt-3 text-sm text-slate-600">Please sign in to manage user access.</p>
        </div>
      </section>
    );
  }

  const token = await getToken();
  if (!token) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-800">Manage Users</h1>
          <p className="mt-3 text-sm text-slate-600">Please sign in to manage user access.</p>
        </div>
      </section>
    );
  }

  const res = await fetch(`${apiBase}/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-rose-700">Access restricted</h1>
          <p className="mt-3 text-sm text-rose-600">
            Unable to verify admin access right now.
          </p>
        </div>
      </section>
    );
  }

  const data = (await res.json()) as { role?: UserRole };
  const role = data.role ?? null;

  if (!isAdminRole(role)) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-rose-700">Access restricted</h1>
          <p className="mt-3 text-sm text-rose-600">
            You need admin access to manage users.
          </p>
        </div>
      </section>
    );
  }

  return <AdminUsersClient initialRole={role} />;
}
