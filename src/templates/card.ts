/**
 * card.ts - SVG template as a TypeScript function
 * All values are escaped to prevent SVG injection.
 */
import type { MetricsResult } from '../metrics.js';

function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function abbreviate(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function cardTemplate(d: MetricsResult): string {
  const filedAndFixedRepos = d.filedAndFixedList
    .map(e => e.repo.split('/')[1] ?? e.repo)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5)
    .join(' · ');

  // CSP-safe initials avatar (raw.githubusercontent.com serves SVGs with
  // `default-src 'none'` which blocks data: URIs in <image> elements, so we
  // never embed a raster avatar). Initials are drawn as pure SVG primitives
  // that render under any CSP. Up to 2 characters: first letter + first
  // uppercase mid-word letter if present.
  const handleChars = d.handle.replace(/[^a-zA-Z0-9]/g, '');
  const firstChar = handleChars[0]?.toUpperCase() ?? '?';
  const midUpper = handleChars.slice(1).match(/[A-Z0-9]/)?.[0];
  const initials = midUpper ? `${firstChar}${midUpper}` : firstChar;
  const initialsFontSize = initials.length === 2 ? 46 : 60;
  const avatarElement =
    `<circle cx="190" cy="200" r="72" fill="url(#avatar-fill)"/>` +
    `<text x="190" y="${initials.length === 2 ? 218 : 220}" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="${initialsFontSize}" font-weight="800" fill="#e2e8f0" text-anchor="middle" letter-spacing="-1">${esc(initials)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="1200" height="600" viewBox="0 0 1200 600"
     role="img" aria-labelledby="card-title card-desc">

  <title id="card-title">${esc(d.handle)} - GitHub Contribution Stats</title>
  <desc id="card-desc">Contribution card for ${esc(d.handle)}: ${esc(d.issuesTotal)} issues filed, ${esc(d.mergedPrCount)} PRs merged, ${esc(d.reposContributed)} repos contributed, ${esc(d.commentThreadCount)} comment threads, ${esc(d.filedAndFixedCount)} filed-and-fixed. Rank: ${esc(d.rank)}.</desc>

  <defs>
    <clipPath id="avatar-clip"><circle cx="190" cy="200" r="72"/></clipPath>
    <clipPath id="clip-tl"><rect x="415" y="40" width="365" height="250" rx="14" ry="14"/></clipPath>
    <clipPath id="clip-tr"><rect x="800" y="40" width="365" height="250" rx="14" ry="14"/></clipPath>
    <clipPath id="clip-bl"><rect x="415" y="310" width="365" height="250" rx="14" ry="14"/></clipPath>
    <clipPath id="clip-br"><rect x="800" y="310" width="365" height="250" rx="14" ry="14"/></clipPath>
    <radialGradient id="avatar-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="avatar-fill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#7c2d92"/>
    </linearGradient>
    <linearGradient id="left-panel-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0e1b3a"/>
      <stop offset="100%" stop-color="#0b1226"/>
    </linearGradient>
  </defs>

  <!-- background -->
  <rect width="1200" height="600" fill="#0b1226"/>
  <rect x="0" y="0" width="400" height="600" fill="url(#left-panel-grad)" opacity="0.9"/>
  <line x1="400" y1="0" x2="400" y2="600" stroke="#1e2d5a" stroke-width="1"/>

  <!-- left panel -->
  <circle cx="190" cy="200" r="88" fill="url(#avatar-glow)"/>
  <circle cx="190" cy="200" r="76" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="6 3" opacity="0.7"/>
  ${avatarElement}
  <text x="190" y="312" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="22" font-weight="700" fill="#e2e8f0" text-anchor="middle" letter-spacing="-0.3">@${esc(d.handle)}</text>
  <text x="190" y="340" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="13" font-weight="400" fill="#64748b" text-anchor="middle">Open Source Contributor</text>
  <line x1="80" y1="362" x2="300" y2="362" stroke="#1e2d5a" stroke-width="1"/>
  <text x="190" y="442" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="13" font-weight="500" fill="#94a3b8" text-anchor="middle">RANK</text>
  <text x="190" y="475" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="36" font-weight="800" fill="#e2e8f0" text-anchor="middle" letter-spacing="-0.5">${esc(d.rank)}</text>
  <rect x="115" y="490" width="150" height="34" rx="17" fill="#1e2d5a"/>
  <text x="190" y="512" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" font-weight="600" fill="#7dd3fc" text-anchor="middle">${esc(d.filedAndFixedCount)} filed &amp; fixed</text>

  <!-- TOP-LEFT: Issues Filed (green) -->
  <rect x="415" y="40" width="365" height="250" rx="14" fill="#0d1f3c"/>
  <rect x="415" y="40" width="365" height="250" rx="14" fill="none" stroke="#22c55e" stroke-width="1.5" opacity="0.6"/>
  <g clip-path="url(#clip-tl)" opacity="0.08">
    <circle cx="680" cy="165" r="200" fill="none" stroke="#22c55e" stroke-width="2"/>
    <circle cx="680" cy="165" r="140" fill="none" stroke="#22c55e" stroke-width="1.5"/>
    <circle cx="680" cy="165" r="80" fill="none" stroke="#22c55e" stroke-width="1"/>
    <line x1="680" y1="40" x2="680" y2="290" stroke="#22c55e" stroke-width="1"/>
    <line x1="415" y1="165" x2="780" y2="165" stroke="#22c55e" stroke-width="1"/>
  </g>
  <text x="437" y="80" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" font-weight="600" fill="#22c55e" letter-spacing="1.5" opacity="0.8">ISSUES FILED</text>
  <text x="437" y="170" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="72" font-weight="800" fill="#e2e8f0" letter-spacing="-3">${esc(abbreviate(d.issuesTotal))}</text>
  <text x="437" y="200" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="13" fill="#64748b">${esc(d.issuesOpen)} open · ${esc(d.issuesClosed)} closed</text>
  <text x="437" y="268" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" fill="#22c55e" opacity="0.7">${d.issueReposTop3.length > 0 ? `top: ${esc(d.issueReposTop3.join(' · '))}` : 'across multiple repos'}</text>

  <!-- TOP-RIGHT: PRs Merged (blue) -->
  <rect x="800" y="40" width="365" height="250" rx="14" fill="#0d1f3c"/>
  <rect x="800" y="40" width="365" height="250" rx="14" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
  <g clip-path="url(#clip-tr)" opacity="0.08">
    <circle cx="820" cy="60" r="180" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <circle cx="820" cy="60" r="120" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
    <circle cx="820" cy="60" r="60" fill="none" stroke="#3b82f6" stroke-width="1"/>
  </g>
  <text x="822" y="80" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" font-weight="600" fill="#3b82f6" letter-spacing="1.5" opacity="0.8">PRS MERGED</text>
  <text x="822" y="170" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="72" font-weight="800" fill="#e2e8f0" letter-spacing="-3">${esc(abbreviate(d.mergedPrCount))}</text>
  <text x="822" y="200" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="13" fill="#64748b">${esc(d.closedPrCount)} closed · ${esc(d.mergedPrCount)} merged</text>
  <text x="822" y="268" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" fill="#3b82f6" opacity="0.7">${d.prReposTop3.length > 0 ? `top: ${esc(d.prReposTop3.join(' · '))}` : 'across multiple repos'}</text>

  <!-- BOTTOM-LEFT: Repos + Comment Threads (purple) -->
  <rect x="415" y="310" width="365" height="250" rx="14" fill="#0d1f3c"/>
  <rect x="415" y="310" width="365" height="250" rx="14" fill="none" stroke="#a855f7" stroke-width="1.5" opacity="0.6"/>
  <g clip-path="url(#clip-bl)" opacity="0.08">
    <line x1="415" y1="310" x2="780" y2="560" stroke="#a855f7" stroke-width="1"/>
    <line x1="780" y1="310" x2="415" y2="560" stroke="#a855f7" stroke-width="1"/>
    <rect x="455" y="350" width="285" height="170" fill="none" stroke="#a855f7" stroke-width="1"/>
  </g>
  <text x="437" y="350" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" font-weight="600" fill="#a855f7" letter-spacing="1.5" opacity="0.8">REPOS CONTRIBUTED</text>
  <text x="437" y="430" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="72" font-weight="800" fill="#e2e8f0" letter-spacing="-3">${esc(abbreviate(d.reposContributed))}</text>
  <text x="437" y="465" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="13" fill="#64748b">distinct repositories</text>
  <text x="437" y="540" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" fill="#a855f7" opacity="0.7">${esc(d.commentThreadCount)} comment threads</text>

  <!-- BOTTOM-RIGHT: Filed-and-Fixed (amber) -->
  <rect x="800" y="310" width="365" height="250" rx="14" fill="#0d1f3c"/>
  <rect x="800" y="310" width="365" height="250" rx="14" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.6"/>
  <g clip-path="url(#clip-br)" opacity="0.08">
    <polygon points="982,310 1165,435 1165,560 800,560 800,435" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <polygon points="982,340 1135,445 1135,530 830,530 830,445" fill="none" stroke="#f59e0b" stroke-width="1"/>
    <line x1="982" y1="310" x2="982" y2="560" stroke="#f59e0b" stroke-width="0.8"/>
  </g>
  <text x="822" y="350" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="12" font-weight="600" fill="#f59e0b" letter-spacing="1.5" opacity="0.8">FILED &amp; FIXED</text>
  <text x="822" y="430" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="72" font-weight="800" fill="#e2e8f0" letter-spacing="-3">${esc(abbreviate(d.filedAndFixedCount))}</text>
  <text x="822" y="465" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="13" fill="#64748b">issues fixed by maintainers</text>
  ${filedAndFixedRepos ? `<text x="822" y="510" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="11" fill="#64748b">${esc(filedAndFixedRepos)}</text>` : ''}
  <text x="822" y="545" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="10" fill="#f59e0b" opacity="0.6">unique metric - no other tool tracks this</text>

</svg>`;
}
