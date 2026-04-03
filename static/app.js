async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.json();
}

function statusClass(status) {
  if (status === "HALAL") return "status status-halal";
  if (status === "CAUTIOUS") return "status status-review";
  return "status status-non-compliant";
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

let screenedStocksCache = [];
let activeSector = "ALL";
let clerkLoaded = false;

function authConfig() {
  return window.HI_AUTH_CONFIG || {};
}

function renderAuthFallback(message, buttonText = "Clerk setup pending") {
  document.getElementById("auth-provider-label").textContent = "Clerk + Google";
  document.getElementById("auth-status-text").textContent = message;
  document.getElementById("auth-action-area").innerHTML = `<button class="ghost-button" type="button" disabled>${buttonText}</button>`;
}

async function initClerkAuth() {
  const config = authConfig();
  const hasFrontend = Boolean(config.clerkPublishableKey && config.clerkJsUrl);

  if (!hasFrontend) {
    renderAuthFallback("Add Clerk keys in .env to enable Google sign-in in the app.");
    return;
  }

  if (!config.googleEnabled) {
    renderAuthFallback("Clerk is configured, but Google sign-in is still disabled in local settings.", "Enable Google in Clerk");
    return;
  }

  const existing = document.querySelector('script[data-hi-clerk="true"]');
  if (!existing) {
    const script = document.getElementById("clerk-script-loader");
    script.setAttribute("data-hi-clerk", "true");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-clerk-publishable-key", config.clerkPublishableKey);
    script.src = config.clerkJsUrl;
    script.type = "text/javascript";
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    }).catch(() => {
      renderAuthFallback("Clerk script could not be loaded. Check CLERK_JS_URL and your internet connection.");
    });
  }

  if (!window.Clerk) {
    return;
  }

  await window.Clerk.load();
  clerkLoaded = true;
  document.getElementById("auth-provider-label").textContent = "Clerk + Google";

  if (window.Clerk.isSignedIn) {
    const user = window.Clerk.user;
    document.getElementById("auth-status-text").textContent = "Signed in with Clerk.";
    document.getElementById("account-name").textContent = user?.fullName || user?.firstName || "Signed in user";
    document.querySelector(".account-avatar").textContent = (user?.firstName || user?.fullName || "U").charAt(0).toUpperCase();
    document.getElementById("account-plan").textContent = "Authenticated session";
    document.getElementById("auth-action-area").innerHTML = '<div id="user-button"></div>';
    window.Clerk.mountUserButton(document.getElementById("user-button"));
  } else {
    document.getElementById("auth-status-text").textContent = "Google sign-in is ready.";
    document.getElementById("auth-action-area").innerHTML = '<div id="sign-in-button"></div>';
    window.Clerk.mountSignIn(document.getElementById("sign-in-button"), {
      appearance: {
        elements: {
          card: {
            backgroundColor: "rgba(18, 31, 45, 0.98)",
            boxShadow: "none",
            border: "1px solid rgba(150, 179, 206, 0.12)",
          },
        },
      },
    });
  }
}

function bindSectionNav() {
  const links = Array.from(document.querySelectorAll(".sidebar-link"));
  const sections = links
    .map((link) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return null;
      const section = document.querySelector(href);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      sections.forEach(({ link, section }) => {
        link.classList.toggle("active", section === visible.target);
      });
    },
    {
      threshold: [0.25, 0.5, 0.75],
      rootMargin: "-20% 0px -55% 0px",
    }
  );

  sections.forEach(({ section }) => observer.observe(section));
}

function renderDrawer({ stock, screening }) {
  document.getElementById("drawer-title").textContent = `${stock.symbol} · ${stock.name}`;
  document.getElementById("drawer-subtitle").textContent = `${stock.sector} · ${screening.profile}`;
  document.getElementById("drawer-status").innerHTML = `<span class="${statusClass(screening.status)}">${screening.status.replaceAll("_", " ")}</span>`;
  document.getElementById("drawer-price").textContent = currency(stock.price);

  const reasons = screening.reasons.length ? screening.reasons : ["No hard-rule failures triggered."];
  const flags = screening.manual_review_flags.length ? screening.manual_review_flags : ["No manual review flags for this stock."];

  document.getElementById("drawer-reasons").innerHTML = reasons.map(item => `<li class="stack-card">${item}</li>`).join("");
  document.getElementById("drawer-flags").innerHTML = flags.map(item => `<li class="stack-card">${item}</li>`).join("");

  const breakdownEntries = Object.entries(screening.breakdown).map(([key, value]) => {
    const label = key.replaceAll("_", " ");
    return `
      <div class="breakdown-item">
        <span class="panel-label">${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  });
  document.getElementById("drawer-breakdown").innerHTML = breakdownEntries.join("");

  const drawer = document.getElementById("stock-drawer");
  drawer.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  const drawer = document.getElementById("stock-drawer");
  drawer.classList.add("hidden");
  drawer.setAttribute("aria-hidden", "true");
}

function bindStockCards() {
  document.querySelectorAll(".stock-card").forEach((card) => {
    card.addEventListener("click", () => {
      const symbol = card.dataset.symbol;
      const selected = screenedStocksCache.find((item) => item.stock.symbol === symbol);
      if (selected) {
        renderDrawer(selected);
      }
    });
  });
}

function renderSectorChips(items) {
  const sectors = ["ALL", ...new Set(items.map((item) => item.stock.sector))];
  const container = document.getElementById("sector-chips");
  container.innerHTML = sectors.map((sector) => `
    <button class="chip ${sector === activeSector ? "active" : ""}" data-sector="${sector}">
      ${sector}
    </button>
  `).join("");

  container.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeSector = chip.dataset.sector;
      renderSectorChips(screenedStocksCache);
      renderStockGrid(screenedStocksCache);
    });
  });
}

function updateExploreStats(items) {
  const visibleItems = items.filter((item) => item.visible);
  document.getElementById("visible-stock-count").textContent = visibleItems.length;
  document.getElementById("visible-halal-count").textContent = visibleItems.filter((item) => item.screening.status === "HALAL").length;
  document.getElementById("visible-review-count").textContent = visibleItems.filter((item) => item.screening.status === "CAUTIOUS").length;
  document.getElementById("visible-non-compliant-count").textContent = visibleItems.filter((item) => item.screening.status === "NON_COMPLIANT").length;
}

function currentExploreFilters() {
  return {
    term: document.getElementById("stock-search").value.trim().toLowerCase(),
    status: document.getElementById("status-filter").value,
    sector: activeSector,
  };
}

function renderStockGrid(items) {
  const filters = currentExploreFilters();
  const hydrated = items.map((item) => {
    const matchesSearch = `${item.stock.symbol} ${item.stock.name}`.toLowerCase().includes(filters.term);
    const matchesStatus = filters.status === "ALL" || item.screening.status === filters.status;
    const matchesSector = filters.sector === "ALL" || item.stock.sector === filters.sector;
    return { ...item, visible: matchesSearch && matchesStatus && matchesSector };
  });

  document.getElementById("stock-grid").innerHTML = hydrated.map(({ stock, screening, visible }) => `
    <div class="stock-card" data-symbol="${stock.symbol}" data-name="${stock.name}" style="display:${visible ? "flex" : "none"}">
      <div class="meta-row"><strong class="stock-symbol">${stock.symbol}</strong><span class="stock-price">${currency(stock.price)}</span></div>
      <p class="stock-name">${stock.name}</p>
      <span class="${statusClass(screening.status)}">${screening.status.replaceAll("_", " ")}</span>
      <p class="muted">${screening.reasons[0] || screening.manual_review_flags[0] || ""}</p>
      <div class="meta-row"><span>${stock.sector}</span><span>${screening.profile}</span></div>
    </div>
  `).join("");

  bindStockCards();
  updateExploreStats(hydrated);
}

function bindExploreFilters() {
  document.getElementById("stock-search").addEventListener("input", () => renderStockGrid(screenedStocksCache));
  document.getElementById("status-filter").addEventListener("change", () => renderStockGrid(screenedStocksCache));
}

function buildPortfolioModule(portfolios, watchlist) {
  const allHoldings = portfolios.flatMap((portfolio) => portfolio.holdings.map((holding) => ({
    ...holding,
    portfolioName: portfolio.name,
  })));

  const totalValue = allHoldings.reduce((sum, holding) => sum + (holding.quantity * holding.stock.price), 0);
  const largest = [...allHoldings].sort((a, b) => (b.quantity * b.stock.price) - (a.quantity * a.stock.price))[0];

  document.getElementById("portfolio-holding-count").textContent = allHoldings.length;
  document.getElementById("portfolio-largest-position").textContent = largest ? largest.stock.symbol : "-";
  document.getElementById("portfolio-watchlist-adjacent").textContent = watchlist.length;

  document.getElementById("portfolio-allocation-grid").innerHTML = allHoldings.map((holding) => {
    const marketValue = holding.quantity * holding.stock.price;
    const allocation = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;
    return `
      <div class="allocation-card">
        <div class="meta-row"><strong>${holding.stock.symbol}</strong><span>${allocation.toFixed(1)}%</span></div>
        <p class="muted">${holding.stock.name}</p>
        <div class="allocation-bar">
          <div class="allocation-fill" style="width:${Math.min(allocation, 100)}%"></div>
        </div>
      </div>
    `;
  }).join("");

  const holdingsWithStatus = allHoldings.map((holding) => {
    const screening = screenedStocksCache.find((item) => item.stock.symbol === holding.stock.symbol)?.screening;
    return { holding, screening };
  });

  document.getElementById("portfolio-list").innerHTML = holdingsWithStatus.map(({ holding, screening }) => {
    const marketValue = holding.quantity * holding.stock.price;
    return `
      <div class="holding-card">
        <div class="holding-topline">
          <div>
            <strong>${holding.stock.symbol} · ${holding.stock.name}</strong>
            <p class="muted">${holding.portfolioName}</p>
          </div>
          <span class="${statusClass(screening?.status || "CAUTIOUS")}">${(screening?.status || "CAUTIOUS").replaceAll("_", " ")}</span>
        </div>
        <div class="holding-grid">
          <div class="holding-metric">
            <span class="panel-label">Market Value</span>
            <strong>${currency(marketValue)}</strong>
          </div>
          <div class="holding-metric">
            <span class="panel-label">Quantity</span>
            <strong>${holding.quantity}</strong>
          </div>
          <div class="holding-metric">
            <span class="panel-label">Target</span>
            <strong>${holding.target_allocation_pct}%</strong>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const alerts = [];
  holdingsWithStatus.forEach(({ holding, screening }) => {
    if (!screening) return;
    if (screening.status === "NON_COMPLIANT") {
      alerts.push(`${holding.stock.symbol} is non-compliant and needs review before being held in a halal portfolio.`);
    } else if (screening.status === "CAUTIOUS") {
      alerts.push(`${holding.stock.symbol} needs manual review before it can be treated as fully clean.`);
    }
    if (holding.target_allocation_pct > 35) {
      alerts.push(`${holding.stock.symbol} target allocation is above 35%, which may create concentration risk.`);
    }
  });

  document.getElementById("portfolio-alerts").innerHTML = (alerts.length ? alerts : [
    "Portfolio is currently aligned with the strict screening profile and no action items were triggered."
  ]).map((alert) => `<div class="alert-card">${alert}</div>`).join("");
}

function buildComplianceModule(rulebook, version, screenedStocks) {
  const profile = rulebook.profiles[0];
  const reviewQueue = screenedStocks.filter((item) => item.screening.status === "CAUTIOUS");

  document.getElementById("compliance-source-count").textContent = profile.primary_sources.length;
  document.getElementById("compliance-review-count").textContent = reviewQueue.length;
  document.getElementById("compliance-rule-count").textContent = profile.hard_rules.length;

  document.getElementById("primary-sources").innerHTML = profile.primary_sources.map((source) => `
    <div class="source-card">
      <span class="panel-label">${source.name}</span>
      <p class="muted">${source.notes}</p>
      <a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">Open source</a>
    </div>
  `).join("");

  document.getElementById("compliance-review-queue").innerHTML = (reviewQueue.length ? reviewQueue.map((item) => `
    <div class="alert-card">
      <strong>${item.stock.symbol}</strong>
      <p class="muted">${item.screening.manual_review_flags[0] || "Needs manual compliance review."}</p>
    </div>
  `) : [
    `<div class="alert-card">No stocks are currently waiting in the manual review queue.</div>`
  ]).join("");

  document.getElementById("compliance-notes").innerHTML = [
    `Rule version ${version.version} is the currently active profile for this app shell.`,
    `Primary source coverage is formalized through ${profile.primary_sources.length} reference anchors.`,
    `Secondary verification exists to strengthen screening without confusing users with multiple public profiles.`,
  ].map((note) => `<div class="note-card">${note}</div>`).join("");
}

function buildAccountModule(owner, portfolios, watchlist, screenedStocks) {
  const readableName = owner.charAt(0).toUpperCase() + owner.slice(1);
  const reviewCount = screenedStocks.filter((item) => item.screening.status === "CAUTIOUS").length;
  const onboardingItems = [
    {
      label: "Strict compliance profile is active",
      detail: "The product is using one strict screening profile across the app.",
      complete: true,
    },
    {
      label: "Portfolio seeded and visible",
      detail: portfolios.length > 0 ? "Your portfolio module is populated and ready for deeper tracking." : "Create your first portfolio to continue.",
      complete: portfolios.length > 0,
    },
    {
      label: "Watchlist created",
      detail: watchlist.length > 0 ? "You already have a watchlist to monitor new candidates." : "Add a few names to start your discovery workflow.",
      complete: watchlist.length > 0,
    },
    {
      label: "Compliance review queue monitored",
      detail: reviewCount > 0 ? `${reviewCount} stock(s) need manual review.` : "No review cases are currently waiting.",
      complete: reviewCount === 0,
    },
    {
      label: "External auth provider still pending",
      detail: "Clerk/Auth0/Firebase-style auth is the next safe step before real multi-user launch.",
      complete: false,
    },
  ];

  document.getElementById("account-name").textContent = readableName;
  document.querySelector(".account-avatar").textContent = readableName.charAt(0).toUpperCase();
  document.getElementById("account-plan").textContent = "Founder mode";

  document.getElementById("onboarding-checklist").innerHTML = onboardingItems.map((item) => `
    <div class="checklist-item">
      <div class="check-indicator ${item.complete ? "check-complete" : "check-pending"}">${item.complete ? "OK" : "!"}</div>
      <div>
        <strong>${item.label}</strong>
        <p class="muted">${item.detail}</p>
      </div>
    </div>
  `).join("");

  document.getElementById("account-readiness").innerHTML = [
    `Workspace owner: ${readableName}`,
    `Portfolio count: ${portfolios.length}`,
    `Watchlist entries: ${watchlist.length}`,
    `Next major unlock: external authentication and user settings`,
  ].map((note) => `<div class="note-card">${note}</div>`).join("");
}

async function loadDashboard() {
  const owner = document.getElementById("owner-input").value.trim() || "aditya";

  const [dashboard, rulebook, versions, portfolios, watchlist, stocks, logs] = await Promise.all([
    fetchJson(`/api/dashboard/${owner}`),
    fetchJson("/api/rulebook"),
    fetchJson("/api/governance/rule-versions"),
    fetchJson(`/api/portfolio/${owner}`),
    fetchJson(`/api/watchlist/${owner}`),
    fetchJson("/api/stocks"),
    fetchJson("/api/screening-logs"),
  ]);

  document.getElementById("portfolio-market-value").textContent = currency(dashboard.portfolio_market_value);
  document.getElementById("halal-holdings").textContent = dashboard.halal_holdings;
  document.getElementById("watchlist-count").textContent = dashboard.watchlist_count;
  document.getElementById("review-holdings").textContent = dashboard.requires_review_holdings;

  const profile = rulebook.profiles[0];
  const version = versions[0];
  document.getElementById("insight-profile").textContent = profile.code;
  document.getElementById("insight-version").textContent = version?.version || "-";
  document.getElementById("insight-universe").textContent = stocks.length;
  document.getElementById("insight-logs").textContent = logs.length;
  document.getElementById("rulebook-code").textContent = profile.code;
  document.getElementById("rulebook-description").textContent = profile.description;
  document.getElementById("hard-rules").innerHTML = profile.hard_rules.map(rule => `<li class="stack-card">${rule}</li>`).join("");
  document.getElementById("secondary-verification").innerHTML = profile.secondary_verification.map(item => `<li class="stack-card">${item}</li>`).join("");

  document.getElementById("rule-version-card").innerHTML = `
    <div class="meta-row"><span>Profile</span><strong>${version.profile_code}</strong></div>
    <div class="meta-row"><span>Version</span><strong>${version.version}</strong></div>
    <div class="meta-row"><span>Status</span><strong>${version.status}</strong></div>
    <div class="meta-row"><span>Approved by</span><strong>${version.approved_by || "Pending advisory sign-off"}</strong></div>
    <p class="muted">${version.notes}</p>
  `;

  document.getElementById("portfolio-list").innerHTML = portfolios.map(portfolio => `
    <div class="stack-card">
      <div class="meta-row"><strong>${portfolio.name}</strong><span>${portfolio.base_currency}</span></div>
      <p class="muted">${portfolio.investment_objective}</p>
      ${portfolio.holdings.map(holding => `
        <div class="meta-row portfolio-holding">
          <span>${holding.stock.symbol} · ${holding.stock.name}</span>
          <span>${holding.quantity} shares · ${currency(holding.stock.price)}</span>
        </div>
      `).join("")}
    </div>
  `).join("");

  document.getElementById("watchlist").innerHTML = watchlist.map(item => `
    <div class="stack-card">
      <div class="meta-row"><strong>${item.stock.symbol}</strong><span>${item.stock.sector}</span></div>
      <p class="muted">${item.notes}</p>
    </div>
  `).join("");

  const screenedStocks = await Promise.all(
    stocks.map(async stock => {
      const screening = await fetchJson(`/api/screen/${stock.symbol}`);
      return { stock, screening };
    })
  );
  screenedStocksCache = screenedStocks;
  buildAccountModule(owner, portfolios, watchlist, screenedStocks);
  buildPortfolioModule(portfolios, watchlist);
  buildComplianceModule(rulebook, version, screenedStocks);
  renderSectorChips(screenedStocks);
  renderStockGrid(screenedStocks);

  document.getElementById("screening-logs").innerHTML = logs.map(log => `
    <div class="log-card">
      <div class="meta-row"><strong>${log.stock.symbol}</strong><span class="${statusClass(log.status)}">${log.status.replace("_", " ")}</span></div>
      <p class="muted">${log.triggered_reasons || log.manual_review_flags || "No issues triggered."}</p>
    </div>
  `).join("");
}

document.getElementById("refresh-button").addEventListener("click", loadDashboard);
document.getElementById("drawer-close").addEventListener("click", closeDrawer);
document.getElementById("drawer-close-button").addEventListener("click", closeDrawer);
bindExploreFilters();
bindSectionNav();
initClerkAuth().catch(() => {
  renderAuthFallback("Clerk initialization failed. Check your Clerk dashboard values.");
});
loadDashboard().catch((error) => {
  console.error(error);
});
