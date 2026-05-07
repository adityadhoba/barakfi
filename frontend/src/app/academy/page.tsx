import { redirect } from "next/navigation";

export default function AcademyPage() {
  redirect("/explore?tab=academy");
}
