// ==========================================================================
// GITHUB PROFILES & IN-APP EXPLORER - APPLICATION LOGIC
// ==========================================================================

// Global In-Memory Cache
const userCache = {
  currentUser: null,
  repos: [],
  starred: null,
  gists: null,
  activeTab: null
};

// DOM Elements
const searchInput = document.querySelector("#inn");
const searchBtn = document.querySelector("#search-btn");
const searchForm = document.querySelector("#search-form");
const profileContainer = document.querySelector("#container");
const activityContainer = document.querySelector("#activity-container");

// Search Event Listeners
if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSearch();
  });
} else if (searchBtn) {
  searchBtn.addEventListener("click", handleSearch);
}

if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  });
}

// Quick Search Chips
document.querySelectorAll(".quick-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = chip.getAttribute("data-user") || chip.textContent.replace("@", "").trim();
      handleSearch();
    }
  });
});

// Main Search Handler
async function handleSearch() {
  const username = searchInput ? searchInput.value.trim() : "";

  if (!username) {
    showError("Please enter a valid GitHub username.");
    return;
  }

  showLoading();

  // Reset Cache for new search
  userCache.currentUser = null;
  userCache.repos = [];
  userCache.starred = null;
  userCache.gists = null;
  userCache.activeTab = null;

  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`)
    ]);

    if (profileRes.status === 404) {
      showError(`User "<strong>${escapeHtml(username)}</strong>" was not found on GitHub.`);
      return;
    }

    if (profileRes.status === 403) {
      showError("GitHub API rate limit reached. Please wait a moment and try again.");
      return;
    }

    if (!profileRes.ok) {
      showError(`GitHub Error: ${profileRes.statusText} (${profileRes.status})`);
      return;
    }

    const profileData = await profileRes.json();
    const reposData = reposRes.ok ? await reposRes.json() : [];

    userCache.currentUser = profileData;
    userCache.repos = reposData;

    renderProfile(profileData, reposData);
    renderActivity(profileData, reposData);
  } catch (error) {
    console.error("Search error:", error);
    showError("Unable to connect to GitHub. Please verify your internet connection.");
  }
}

// ==========================================================================
// RENDER PROFILE (LEFT COLUMN)
// ==========================================================================

function renderProfile(user, repos = []) {
  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "N/A";

  const bioHtml = user.bio
    ? escapeHtml(user.bio)
    : '<span class="text-muted fst-italic">This profile has no bio.</span>';

  const locationHtml = user.location
    ? `<div class="meta-item"><i class="bi bi-geo-alt"></i> <span>${escapeHtml(user.location)}</span></div>`
    : "";

  const companyHtml = user.company
    ? `<div class="meta-item"><i class="bi bi-building"></i> <span>${escapeHtml(user.company)}</span></div>`
    : "";

  const blogHtml = user.blog
    ? `<div class="meta-item"><i class="bi bi-link-45deg"></i> <a href="${ensureHttp(user.blog)}" target="_blank" rel="noopener noreferrer">${escapeHtml(user.blog)}</a></div>`
    : "";

  const twitterHtml = user.twitter_username
    ? `<div class="meta-item"><i class="bi bi-twitter-x"></i> <a href="https://twitter.com/${escapeHtml(user.twitter_username)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(user.twitter_username)}</a></div>`
    : "";

  // Render recent 4 repos
  let reposHtml = "";
  const displayRepos = Array.isArray(repos) ? repos.slice(0, 4) : [];
  if (displayRepos.length > 0) {
    const repoCards = displayRepos.map(repo => `
      <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card">
        <div class="repo-name">
          <i class="bi bi-journal-code"></i>
          <span>${escapeHtml(repo.name)}</span>
        </div>
        <p class="repo-desc">${repo.description ? escapeHtml(repo.description) : "No description provided."}</p>
        <div class="repo-stats">
          ${repo.language ? `<span class="repo-lang"><span class="lang-dot"></span>${escapeHtml(repo.language)}</span>` : ""}
          <span class="repo-stat"><i class="bi bi-star"></i> ${repo.stargazers_count}</span>
          <span class="repo-stat"><i class="bi bi-bezier2"></i> ${repo.forks_count}</span>
        </div>
      </a>
    `).join("");

    reposHtml = `
      <div class="repos-section">
        <h4 class="repos-title"><i class="bi bi-stars"></i> Latest Repositories</h4>
        <div class="repos-grid">
          ${repoCards}
        </div>
      </div>
    `;
  }

  profileContainer.innerHTML = `
    <article class="profile-card fade-in">
      <div class="profile-header">
        <div class="avatar-wrapper">
          <img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.name || user.login)} avatar" class="avatar-img" />
          <div class="status-indicator" title="Active GitHub User"></div>
        </div>
        
        <div class="user-details">
          <div class="name-row">
            <h2 class="user-name">${escapeHtml(user.name || user.login)}</h2>
            <a href="${user.html_url}" target="_blank" rel="noopener noreferrer" class="github-link-btn" title="Open GitHub Profile">
              <span>View GitHub</span>
              <i class="bi bi-box-arrow-up-right"></i>
            </a>
          </div>
          <span class="user-handle">@${escapeHtml(user.login)}</span>
          <div class="user-joined">
            <i class="bi bi-calendar3"></i> Joined ${formattedDate}
          </div>
        </div>
      </div>

      <div class="profile-bio">
        ${bioHtml}
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-label">Repositories</span>
          <strong class="stat-value">${(user.public_repos || 0).toLocaleString()}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">Followers</span>
          <strong class="stat-value">${(user.followers || 0).toLocaleString()}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">Following</span>
          <strong class="stat-value">${(user.following || 0).toLocaleString()}</strong>
        </div>
      </div>

      <div class="meta-grid">
        ${locationHtml}
        ${companyHtml}
        ${blogHtml}
        ${twitterHtml}
      </div>

      ${reposHtml}
    </article>
  `;
}

// ==========================================================================
// RENDER ACTIVITY & CONTRIBUTION HEATMAP (RIGHT COLUMN)
// ==========================================================================

function renderActivity(user, repos = []) {
  if (!activityContainer) return;

  // Language Breakdown
  const langCounts = {};
  let totalReposWithLang = 0;

  if (Array.isArray(repos)) {
    repos.forEach((repo) => {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
        totalReposWithLang++;
      }
    });
  }

  const langPalette = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572a5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Rust: "#dea584",
    Go: "#00add8",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    PHP: "#4f5d95",
    Ruby: "#701516",
    Shell: "#89e051",
    Dart: "#00b4ab",
    Kotlin: "#a97bff",
    Swift: "#f05138"
  };

  const sortedLangs = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let langBarsHtml = "";
  let langLegendHtml = "";

  if (sortedLangs.length > 0 && totalReposWithLang > 0) {
    langBarsHtml = sortedLangs.map(([lang, count]) => {
      const pct = Math.round((count / totalReposWithLang) * 100);
      const color = langPalette[lang] || "#06b6d4";
      return `<div class="lang-bar-segment" style="width: ${pct}%; background-color: ${color};" title="${escapeHtml(lang)}: ${pct}%"></div>`;
    }).join("");

    langLegendHtml = sortedLangs.map(([lang, count]) => {
      const pct = Math.round((count / totalReposWithLang) * 100);
      const color = langPalette[lang] || "#06b6d4";
      return `
        <div class="lang-legend-item">
          <span class="lang-legend-dot" style="background-color: ${color};"></span>
          <span class="lang-legend-name">${escapeHtml(lang)}</span>
          <span class="lang-legend-pct">${pct}%</span>
        </div>
      `;
    }).join("");
  }

  const chartUrl = `https://ghchart.rshah.org/40c463/${encodeURIComponent(user.login)}`;

  activityContainer.innerHTML = `
    <article class="activity-card fade-in">
      <div class="activity-header">
        <div class="activity-title-group">
          <div class="activity-title">
            <span class="activity-pulse"></span>
            <h3>Contribution Activity</h3>
          </div>
          <span class="activity-subtitle">1-Year Commit & Work Heatmap</span>
        </div>
        <a href="https://github.com/${encodeURIComponent(user.login)}" target="_blank" rel="noopener noreferrer" class="activity-gh-badge" title="Open on GitHub">
          <i class="bi bi-box-arrow-up-right"></i>
        </a>
      </div>

      <!-- Green Contribution Table (Heatmap) -->
      <div class="heatmap-section">
        <div class="heatmap-header">
          <span class="heatmap-label"><i class="bi bi-grid-3x3-gap-fill"></i> Contribution Calendar</span>
          <div class="heatmap-legend">
            <span class="legend-text">Less</span>
            <span class="legend-box" style="background-color: #161b22;"></span>
            <span class="legend-box" style="background-color: #0e4429;"></span>
            <span class="legend-box" style="background-color: #006d32;"></span>
            <span class="legend-box" style="background-color: #26a641;"></span>
            <span class="legend-box" style="background-color: #39d353;"></span>
            <span class="legend-text">More</span>
          </div>
        </div>

        <div class="heatmap-scroll-wrapper">
          <img 
            src="${chartUrl}" 
            alt="${escapeHtml(user.login)}'s GitHub Contribution Chart" 
            class="heatmap-img"
            loading="lazy"
            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'heatmap-error\\'>Unable to load contribution heatmap for this user.</div>';"
          />
        </div>
        <p class="heatmap-hint"><i class="bi bi-arrows-expand"></i> Scroll horizontally if viewed on mobile devices</p>
      </div>

      <!-- Languages Breakdown -->
      ${sortedLangs.length > 0 ? `
        <div class="lang-section">
          <h4 class="lang-title"><i class="bi bi-pie-chart"></i> Top Languages Used</h4>
          <div class="lang-progress-bar">
            ${langBarsHtml}
          </div>
          <div class="lang-legend-grid">
            ${langLegendHtml}
          </div>
        </div>
      ` : ""}

      <!-- In-App Interactive Explorer Action Buttons -->
      <div class="quick-links-section">
        <button type="button" class="quick-action-btn" data-tab="repos" id="tab-btn-repos">
          <i class="bi bi-folder2-open"></i> All Repos (${(user.public_repos || 0).toLocaleString()})
        </button>
        <button type="button" class="quick-action-btn" data-tab="starred" id="tab-btn-starred">
          <i class="bi bi-star"></i> Starred Repos
        </button>
        <button type="button" class="quick-action-btn" data-tab="gists" id="tab-btn-gists">
          <i class="bi bi-file-earmark-code"></i> Gists (${(user.public_gists || 0).toLocaleString()})
        </button>
      </div>

      <!-- In-App Dynamic Explorer Container -->
      <div id="in-app-explorer" class="explorer-panel" style="display: none;"></div>
    </article>
  `;

  // Attach tab listeners
  attachExplorerListeners(user);
}

// ==========================================================================
// IN-APP EXPLORER: ALL REPOS, STARRED, & GISTS
// Shows real-time data directly inside the page without navigating away
// ==========================================================================

function attachExplorerListeners(user) {
  const tabButtons = activityContainer.querySelectorAll(".quick-action-btn");
  const explorerPanel = document.querySelector("#in-app-explorer");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const tab = btn.getAttribute("data-tab");

      // Toggle close if already active
      if (userCache.activeTab === tab) {
        userCache.activeTab = null;
        btn.classList.remove("active");
        if (explorerPanel) {
          explorerPanel.style.display = "none";
          explorerPanel.innerHTML = "";
        }
        return;
      }

      // Update active state on buttons
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      userCache.activeTab = tab;

      // Render tab in explorer
      await loadExplorerTab(tab, user);
    });
  });
}

async function loadExplorerTab(tab, user) {
  const explorerPanel = document.querySelector("#in-app-explorer");
  if (!explorerPanel) return;

  explorerPanel.style.display = "block";
  explorerPanel.innerHTML = `
    <div class="explorer-loading">
      <div class="spinner-sm"></div>
      <span>Fetching ${tab === "repos" ? "repositories" : tab === "starred" ? "starred repositories" : "gists"} from GitHub API...</span>
    </div>
  `;

  try {
    let items = [];

    if (tab === "repos") {
      if (userCache.repos && userCache.repos.length > 0) {
        items = userCache.repos;
      } else {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user.login)}/repos?sort=updated&per_page=50`);
        items = res.ok ? await res.json() : [];
        userCache.repos = items;
      }
      renderReposTab(items, explorerPanel, user);
    } else if (tab === "starred") {
      if (userCache.starred) {
        items = userCache.starred;
      } else {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user.login)}/starred?per_page=50`);
        items = res.ok ? await res.json() : [];
        userCache.starred = items;
      }
      renderStarredTab(items, explorerPanel, user);
    } else if (tab === "gists") {
      if (userCache.gists) {
        items = userCache.gists;
      } else {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user.login)}/gists?per_page=50`);
        items = res.ok ? await res.json() : [];
        userCache.gists = items;
      }
      renderGistsTab(items, explorerPanel, user);
    }
  } catch (error) {
    console.error("Explorer fetch error:", error);
    explorerPanel.innerHTML = `
      <div class="explorer-error">
        <i class="bi bi-exclamation-circle"></i>
        <span>Failed to load ${tab}. Please try again.</span>
      </div>
    `;
  }
}

// Render Repositories Inside Explorer
function renderReposTab(repos, container, user) {
  const count = Array.isArray(repos) ? repos.length : 0;

  container.innerHTML = `
    <div class="explorer-header">
      <div class="explorer-title">
        <i class="bi bi-folder2-open"></i>
        <strong>Public Repositories (${count})</strong>
      </div>
      <button type="button" class="explorer-close-btn" title="Close Explorer"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="explorer-filter-box">
      <i class="bi bi-search"></i>
      <input type="text" id="explorer-filter" class="explorer-filter-input" placeholder="Filter repositories by name or language..." />
    </div>

    <div class="explorer-list" id="explorer-list-container">
      ${buildReposListHtml(repos)}
    </div>
  `;

  wireExplorerFilter(repos, (filtered) => buildReposListHtml(filtered));
  wireExplorerClose(container);
}

function buildReposListHtml(repos) {
  if (!Array.isArray(repos) || repos.length === 0) {
    return `<div class="explorer-empty">No repositories found.</div>`;
  }

  return repos.map(repo => `
    <div class="explorer-item">
      <div class="explorer-item-top">
        <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="explorer-item-title">
          <i class="bi bi-journal-code"></i>
          <span>${escapeHtml(repo.name)}</span>
        </a>
        <div class="explorer-item-stats">
          ${repo.language ? `<span class="repo-lang"><span class="lang-dot"></span>${escapeHtml(repo.language)}</span>` : ""}
          <span><i class="bi bi-star"></i> ${repo.stargazers_count}</span>
          <span><i class="bi bi-bezier2"></i> ${repo.forks_count}</span>
        </div>
      </div>
      <p class="explorer-item-desc">${repo.description ? escapeHtml(repo.description) : "No description provided."}</p>
    </div>
  `).join("");
}

// Render Starred Repos Inside Explorer
function renderStarredTab(starred, container, user) {
  const count = Array.isArray(starred) ? starred.length : 0;

  container.innerHTML = `
    <div class="explorer-header">
      <div class="explorer-title">
        <i class="bi bi-star-fill text-warning"></i>
        <strong>Starred Repositories (${count})</strong>
      </div>
      <button type="button" class="explorer-close-btn" title="Close Explorer"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="explorer-filter-box">
      <i class="bi bi-search"></i>
      <input type="text" id="explorer-filter" class="explorer-filter-input" placeholder="Filter starred repos by name or owner..." />
    </div>

    <div class="explorer-list" id="explorer-list-container">
      ${buildStarredListHtml(starred)}
    </div>
  `;

  wireExplorerFilter(starred, (filtered) => buildStarredListHtml(filtered));
  wireExplorerClose(container);
}

function buildStarredListHtml(starred) {
  if (!Array.isArray(starred) || starred.length === 0) {
    return `<div class="explorer-empty">No starred repositories found for this user.</div>`;
  }

  return starred.map(repo => `
    <div class="explorer-item">
      <div class="explorer-item-top">
        <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="explorer-item-title">
          <i class="bi bi-star"></i>
          <span>${escapeHtml(repo.full_name || repo.name)}</span>
        </a>
        <div class="explorer-item-stats">
          ${repo.language ? `<span class="repo-lang"><span class="lang-dot"></span>${escapeHtml(repo.language)}</span>` : ""}
          <span><i class="bi bi-star-fill text-warning"></i> ${repo.stargazers_count}</span>
        </div>
      </div>
      <p class="explorer-item-desc">${repo.description ? escapeHtml(repo.description) : "No description provided."}</p>
    </div>
  `).join("");
}

// Render Gists Inside Explorer
function renderGistsTab(gists, container, user) {
  const count = Array.isArray(gists) ? gists.length : 0;

  container.innerHTML = `
    <div class="explorer-header">
      <div class="explorer-title">
        <i class="bi bi-file-earmark-code"></i>
        <strong>Public Gists (${count})</strong>
      </div>
      <button type="button" class="explorer-close-btn" title="Close Explorer"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="explorer-filter-box">
      <i class="bi bi-search"></i>
      <input type="text" id="explorer-filter" class="explorer-filter-input" placeholder="Filter gists by filename or description..." />
    </div>

    <div class="explorer-list" id="explorer-list-container">
      ${buildGistsListHtml(gists)}
    </div>
  `;

  wireExplorerFilter(gists, (filtered) => buildGistsListHtml(filtered));
  wireExplorerClose(container);
}

function buildGistsListHtml(gists) {
  if (!Array.isArray(gists) || gists.length === 0) {
    return `<div class="explorer-empty">No public gists found for this user.</div>`;
  }

  return gists.map(gist => {
    const filenames = Object.keys(gist.files || {});
    const mainFile = filenames[0] || "gistfile";
    const fileLang = gist.files[mainFile]?.language || "Snippet";
    const formattedDate = gist.created_at ? new Date(gist.created_at).toLocaleDateString() : "";

    return `
      <div class="explorer-item">
        <div class="explorer-item-top">
          <a href="${gist.html_url}" target="_blank" rel="noopener noreferrer" class="explorer-item-title">
            <i class="bi bi-file-code"></i>
            <span>${escapeHtml(mainFile)}</span>
          </a>
          <div class="explorer-item-stats">
            <span class="repo-lang"><span class="lang-dot"></span>${escapeHtml(fileLang)}</span>
            <span><i class="bi bi-calendar"></i> ${formattedDate}</span>
          </div>
        </div>
        <p class="explorer-item-desc">${gist.description ? escapeHtml(gist.description) : "No description provided."}</p>
      </div>
    `;
  }).join("");
}

// Helper: Wire Live Filter Input
function wireExplorerFilter(items, renderCallback) {
  const filterInput = document.querySelector("#explorer-filter");
  const listContainer = document.querySelector("#explorer-list-container");

  if (filterInput && listContainer) {
    filterInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        listContainer.innerHTML = renderCallback(items);
        return;
      }

      const filtered = items.filter(item => {
        const name = (item.name || item.full_name || Object.keys(item.files || {})[0] || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const lang = (item.language || "").toLowerCase();
        return name.includes(q) || desc.includes(q) || lang.includes(q);
      });

      listContainer.innerHTML = renderCallback(filtered);
    });
  }
}

// Helper: Wire Close Button
function wireExplorerClose(container) {
  const closeBtn = container.querySelector(".explorer-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      container.style.display = "none";
      container.innerHTML = "";
      userCache.activeTab = null;
      document.querySelectorAll(".quick-action-btn").forEach(b => b.classList.remove("active"));
    });
  }
}

// UI State Helpers
function showLoading() {
  profileContainer.innerHTML = `
    <div class="state-card loading-state fade-in">
      <div class="spinner"></div>
      <p class="state-title">Retrieving Profile...</p>
      <p class="state-text">Scanning GitHub API for developer details and statistics.</p>
    </div>
  `;

  if (activityContainer) {
    activityContainer.innerHTML = `
      <div class="state-card loading-state fade-in">
        <div class="spinner"></div>
        <p class="state-title">Loading Heatmap...</p>
        <p class="state-text">Fetching green contribution chart and commit data.</p>
      </div>
    `;
  }
}

function showError(message) {
  profileContainer.innerHTML = `
    <div class="state-card error-state fade-in">
      <div class="state-icon"><i class="bi bi-exclamation-triangle"></i></div>
      <p class="state-title">Lookup Failed</p>
      <p class="state-text">${message}</p>
    </div>
  `;

  if (activityContainer) {
    activityContainer.innerHTML = `
      <div class="initial-placeholder">
        <div class="initial-icon"><i class="bi bi-exclamation-circle"></i></div>
        <h3>No Data Available</h3>
        <p>Please enter a valid username to visualize their activity heatmap.</p>
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ensureHttp(url) {
  if (!url) return "#";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}