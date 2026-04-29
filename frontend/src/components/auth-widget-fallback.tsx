"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClerkFailed, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

type AuthWidgetFallbackProps = {
  mode: "sign-in" | "sign-up";
  children: React.ReactNode;
};

export function AuthWidgetFallback({ mode, children }: AuthWidgetFallbackProps) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowFallback(true), 6000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <ClerkLoaded>{children}</ClerkLoaded>
      <ClerkFailed>
        <div className="authFallbackCard">
          <h3>Unable to load authentication</h3>
          <p>
            We could not initialize secure sign in right now. Please refresh once, or try again in a few
            moments.
          </p>
          <div className="authFallbackActions">
            <button
              type="button"
              className="solidButton"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <Link className="ghostButtonLink" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </ClerkFailed>
      <ClerkLoading>
        {!showFallback ? (
          <div className="authFallbackCard">
            <h3>Loading secure {mode === "sign-in" ? "sign in" : "sign up"}…</h3>
            <p>Please wait while we connect the authentication service.</p>
          </div>
        ) : (
          <div className="authFallbackCard">
            <h3>Unable to load authentication</h3>
            <p>
              We could not load the secure auth window right now. Please refresh once, or try again in a few
              moments.
            </p>
            <div className="authFallbackActions">
              <button
                type="button"
                className="solidButton"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
              <Link className="ghostButtonLink" href="/">
                Back to home
              </Link>
            </div>
          </div>
        )}
      </ClerkLoading>
    </>
  );
}
