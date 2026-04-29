import { redirect } from "next/navigation";

export default function UnauthorizedSignInRedirectPage() {
  redirect("https://accounts.barakfi.in/unauthorized-sign-in");
}
