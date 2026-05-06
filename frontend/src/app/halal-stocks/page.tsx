import { redirect } from "next/navigation";

export default function HalalStocksPage() {
  redirect("/explore?tab=halal");
}
