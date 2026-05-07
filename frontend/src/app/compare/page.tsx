import { redirect } from "next/navigation";

export default function ComparePage() {
  redirect("/tools?tab=compare");
}
