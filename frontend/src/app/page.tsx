import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="shellPage shellPageHomeMinimal">
      <HomeDashboard />
    </main>
  );
}
