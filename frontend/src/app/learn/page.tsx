import { redirect } from "next/navigation";

export default function LearnIndexPage() {
  redirect("/explore?tab=learn");
}
