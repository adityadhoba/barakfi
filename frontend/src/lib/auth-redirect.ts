export function getSafeRedirectPath(redirect: string | null | undefined): string {
  if (!redirect) return "/";

  try {
    const decoded = decodeURIComponent(redirect);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded;
  } catch {
    return "/";
  }
}

export function buildLoginUrl(currentPath: string): string {
  const safePath = getSafeRedirectPath(currentPath);
  return `/sign-in?redirect=${encodeURIComponent(safePath)}`;
}

export function buildSignupUrl(currentPath: string): string {
  const safePath = getSafeRedirectPath(currentPath);
  return `/sign-up?redirect=${encodeURIComponent(safePath)}`;
}

export function buildCurrentPath(pathname: string, queryString: string): string {
  return queryString ? `${pathname}?${queryString}` : pathname;
}
