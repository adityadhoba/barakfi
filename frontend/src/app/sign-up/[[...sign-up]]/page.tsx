import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignUpRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const redirectUrl = first(params.redirect_url) ?? first(params.redirectUrl);
  const base = "https://accounts.barakfi.in/sign-up";
  const href = redirectUrl
    ? `${base}?redirect_url=${encodeURIComponent(redirectUrl)}`
    : base;
  redirect(href);
}
