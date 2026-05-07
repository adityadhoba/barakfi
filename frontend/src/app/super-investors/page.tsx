import { redirect } from "next/navigation";

export default function SuperInvestorsPage() {
  redirect("/explore?tab=superinvestors");
}
