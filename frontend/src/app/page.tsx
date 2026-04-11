import { ProductCheckHome } from "@/components/product-check-home";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="shellPage shellPageHero">
      <ProductCheckHome />
    </main>
  );
}
