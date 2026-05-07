import { redirect } from "next/navigation";

export default function RequestCoveragePage() {
  redirect("/tools?tab=request");
}
