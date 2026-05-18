"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import { buildCurrentPath, buildLoginUrl, buildSignupUrl } from "@/lib/auth-redirect";

type Props = {
  className?: string;
  ghostClassName: string;
  primaryClassName: string;
  userClassName?: string;
  activeAuth?: "sign-in" | "sign-up";
  ghostActiveClassName?: string;
  primaryActiveClassName?: string;
};

export function RouteLocalAuth({
  className,
  ghostClassName,
  primaryClassName,
  userClassName,
  activeAuth,
  ghostActiveClassName,
  primaryActiveClassName,
}: Props) {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = buildCurrentPath(pathname, searchParams.toString());
  const signInHref = buildLoginUrl(currentPath);
  const signUpHref = buildSignupUrl(currentPath);

  if (!isLoaded || !userId) {
    return (
      <div className={className}>
        <Link
          className={`${ghostClassName} ${activeAuth === "sign-in" && ghostActiveClassName ? ghostActiveClassName : ""}`.trim()}
          href={signInHref}
        >
          Log in
        </Link>
        <Link
          className={`${primaryClassName} ${activeAuth === "sign-up" && primaryActiveClassName ? primaryActiveClassName : ""}`.trim()}
          href={signUpHref}
        >
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <Link className={ghostClassName} href="/account">
        Account
      </Link>
      <div className={userClassName}>
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: 30, height: 30 },
            },
          }}
        />
      </div>
    </div>
  );
}
