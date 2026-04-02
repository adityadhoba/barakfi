import { auth } from "@clerk/nextjs/server";
import { HomeDashboard } from "@/components/home-dashboard";

export default async function Home() {
  const { userId } = await auth();
  return (
    <main className="shellPage">
      <HomeDashboard isSignedIn={Boolean(userId)} />
    </main>
  );
}
