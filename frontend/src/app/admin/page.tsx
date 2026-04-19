import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { AdminPanel } from "./admin-panel";
import s from "./admin.module.css";

type MePayload = { role?: string; email?: string };

async function checkAdminAccess() {
  const authState = await auth();
  const { userId } = authState;

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const token = await authState.getToken();
  if (!token) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const clerkUser = await currentUser();

  try {
    const apiBase = getPublicApiBaseUrl();
    // Same path as GET /api/me: internal actor headers + JWT so ADMIN_EMAILS matches Clerk email
    // even when the session JWT omits an `email` claim.
    const response = await fetch(`${apiBase}/me`, {
      headers: buildBackendHeaders({
        token,
        actor: {
          authSubject: clerkUser?.id ?? userId,
          email: clerkUser?.primaryEmailAddress?.emailAddress,
        },
      }),
      cache: "no-store",
    });

    const body: unknown = await response.json().catch(() => null);
    const user = adaptBackendJsonForProxy(body, response.ok) as MePayload | null;

    if (!response.ok || !user || !["admin", "owner"].includes(user.role ?? "")) {
      redirect("/admin/forbidden");
    }

    return user;
  } catch (error) {
    console.error("Admin access check failed:", error);
    redirect("/admin/forbidden");
  }
}

export const metadata = {
  title: "Admin Panel — Barakfi",
  description:
    "Restricted BarakFi admin console for operators who manage roles, support queues, and internal governance — authenticated access only; not a public marketing or help page for investors.",
  robots: { index: false, follow: true },
};

export default async function AdminPage() {
  await checkAdminAccess();

  return (
    <div className={s.adminPageContainer}>
      <div className={s.adminPageHeader}>
        <h1>Admin</h1>
        <p className={s.adminPageSubtitle}>Users · Coverage · Feedback · Demand</p>
      </div>
      <AdminPanel />
    </div>
  );
}
