import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminPanel } from "./admin-panel";
import s from "./admin.module.css";

async function checkAdminAccess() {
  const authState = await auth();
  const { userId } = authState;

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  // Get Clerk JWT token for backend authentication
  const token = await authState.getToken();
  if (!token) {
    redirect("/");
  }

  // Fetch user details from API to check role
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";
    const response = await fetch(`${apiBase}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      redirect("/");
    }

    const user = await response.json();

    // Check if user is admin (role = admin or is in legacy admin list)
    if (user.role !== "admin") {
      redirect("/");
    }

    return user;
  } catch (error) {
    console.error("Admin access check failed:", error);
    redirect("/");
  }
}

export const metadata = {
  title: "Admin Panel — Barakfi",
  description: "User and role management console",
};

export default async function AdminPage() {
  const user = await checkAdminAccess();

  return (
    <div className={s.adminPageContainer}>
      <div className={s.adminPageHeader}>
        <h1>Admin Panel</h1>
        <p className={s.adminPageSubtitle}>User and role management</p>
      </div>
      <AdminPanel currentUserEmail={user.email} />
    </div>
  );
}
