export type ChromeRouteFlags = {
  isHome: boolean;
  isScreener: boolean;
  isStockPage: boolean;
  isCollectionDetail: boolean;
  isSuperInvestorDetail: boolean;
  isAbout: boolean;
  isAccount: boolean;
  isExplore: boolean;
  isTools: boolean;
  isCompare: boolean;
  isWatchlist: boolean;
  isTrending: boolean;
  isMethodology: boolean;
  isLegal: boolean;
  isAuthRoute: boolean;
  isLearn: boolean;
  hideGlobalChrome: boolean;
  hideTopbarSearch: boolean;
};

export function getChromeRouteFlags(pathname: string): ChromeRouteFlags {
  const isHome = pathname === "/";
  const isScreener = pathname === "/screener";
  const isStockPage = pathname.startsWith("/stocks/");
  const isCollectionDetail = pathname.startsWith("/collections/");
  const isSuperInvestorDetail = pathname.startsWith("/super-investors/");
  const isAbout = pathname === "/about-us";
  const isAccount = pathname === "/account";
  const isExplore = pathname === "/explore";
  const isTools = pathname === "/tools";
  const isCompare = pathname === "/compare" || pathname.startsWith("/compare/");
  const isWatchlist = pathname === "/watchlist";
  const isTrending = pathname === "/trending";
  const isMethodology = pathname === "/methodology";
  const isLegal = pathname === "/disclaimer" || pathname === "/privacy" || pathname === "/terms";
  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isLearn = pathname.startsWith("/learn");

  const hideGlobalChrome =
    isHome ||
    isScreener ||
    isStockPage ||
    isCollectionDetail ||
    isSuperInvestorDetail ||
    isAbout ||
    isAccount ||
    isExplore ||
    isTools ||
    isCompare ||
    isWatchlist ||
    isTrending ||
    isMethodology ||
    isLegal ||
    isAuthRoute ||
    isLearn;

  const hideTopbarSearch =
    hideGlobalChrome ||
    isTools ||
    isCompare;

  return {
    isHome,
    isScreener,
    isStockPage,
    isCollectionDetail,
    isSuperInvestorDetail,
    isAbout,
    isAccount,
    isExplore,
    isTools,
    isCompare,
    isWatchlist,
    isTrending,
    isMethodology,
    isLegal,
    isAuthRoute,
    isLearn,
    hideGlobalChrome,
    hideTopbarSearch,
  };
}
