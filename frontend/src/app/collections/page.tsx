import { redirect } from "next/navigation";

export default function CollectionsPage() {
  redirect("/explore?tab=collections");
}
