# GitHub Profiles Searcher

Search any GitHub user and inspect their profile, repositories, follower
stats, and contribution activity — all in one static page. No build step,
no backend, no API key.

## What it does

- **Profile search** — enter any GitHub username (or tap a trending chip
  such as `@torvalds`) to load their avatar, bio, location, company, blog,
  join date, and public repo / follower / following counts.
- **Latest repositories** — the 4 most recently updated public repos, with
  language, stars, and forks, linking out to GitHub.
- **Contribution heatmap** — the user's 1-year green contribution calendar
  (via `ghchart.rshah.org`) with a language breakdown of their recent repos.
- **In-app explorer** — browse all repos, starred repos, and gists inside
  the page, with a live filter, without navigating away.

Data comes from the public, unauthenticated GitHub REST API, so searches are
subject to GitHub's unauthenticated rate limit (60 requests/hour per IP).
If the limit is hit the app shows a "rate limit reached" message — just
wait a little and try again.

## Live site

**https://raoraza12.github.io/Github-Profiles-Searcher/**

Hosted on GitHub Pages from the `main` branch (`/root`). Verified live
26 November 2026 — the page renders the search UI.

## Run locally

No install step — it is plain `index.html` + `style.css` + `app.js`.

```bash
# Option 1: open the file directly
open index.html        # or double-click it

# Option 2: serve over HTTP (recommended — avoids any file:// quirks)
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure: search bar, profile column, activity column |
| `style.css` | Dark glassmorphism theme, responsive two-column layout |
| `app.js` | GitHub API calls, profile/activity rendering, in-app explorer |

## Notes

- There is no backend and no environment variable / secret in this repo.
  If one is ever added, keep it out of client-side code and out of git
  (`.gitignore` already covers `.env`).
