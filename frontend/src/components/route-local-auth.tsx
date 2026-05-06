"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";

type Props = {
  className?: string;
  ghostClassName: string;
  primaryClassName: string;
  userClassName?: string;
};

export function RouteLocalAuth({ className, ghostClassName, primaryClassName, userClassName }: Props) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded || !userId) {
    return (
      <div className={className}>
        <Link className={ghostClassName} href="/sign-in">
          Log in
        </Link>
        <Link className={primaryClassName} href="/sign-up">
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
