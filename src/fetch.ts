/**
 * fetch.ts - all GitHub API calls
 * Returns RawData shape consumed by metrics.ts
 */
import { graphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';

export interface FetchOptions {
  user: string;
  token: string;
  noAvatar?: boolean;
}

export interface RawIssue {
  number: number;
  repo: string;       // "owner/repo"
  state: 'OPEN' | 'CLOSED';
  title: string;
  url: string;
}

export interface FiledAndFixedEntry {
  issueUrl: string;
  closingPrUrl: string;
  closingPrAuthor: string;
  repo: string;
}

export interface RawData {
  user: string;
  avatarUrl: string;        // data: URI or empty string if noAvatar
  avatarAlt: string;
  issuesOpen: number;
  issuesClosed: number;
  issuesList: RawIssue[];   // up to 200 closed, for timeline walk
  mergedPrCount: number;
  closedPrCount: number;
  reposFromIssues: string[];
  reposFromPrs: string[];
  commentThreadCount: number;
  filedAndFixed: FiledAndFixedEntry[];
}

const ISSUES_QUERY = `
  query($q_open: String!, $q_closed: String!) {
    open: search(query: $q_open, type: ISSUE, first: 0) { issueCount }
    closed: search(query: $q_closed, type: ISSUE, first: 0) { issueCount }
  }
`;

const ISSUES_LIST_QUERY = `
  query($q: String!, $after: String) {
    search(query: $q, type: ISSUE, first: 100, after: $after) {
      issueCount
      pageInfo { hasNextPage endCursor }
      nodes {
        ... on Issue {
          number
          state
          title
          url
          repository { nameWithOwner }
        }
      }
    }
  }
`;

const PRS_QUERY = `
  query($q_merged: String!, $q_closed: String!) {
    merged: search(query: $q_merged, type: ISSUE, first: 0) { issueCount }
    closed: search(query: $q_closed, type: ISSUE, first: 0) { issueCount }
  }
`;

const PRS_REPOS_QUERY = `
  query($q: String!, $after: String) {
    search(query: $q, type: ISSUE, first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        ... on PullRequest {
          repository { nameWithOwner }
        }
      }
    }
  }
`;

const COMMENT_THREADS_QUERY = `
  query($q: String!, $after: String) {
    search(query: $q, type: ISSUE, first: 100, after: $after) {
      issueCount
      pageInfo { hasNextPage endCursor }
      nodes {
        ... on Issue { url }
        ... on PullRequest { url }
      }
    }
  }
`;

interface TimelineEvent {
  event: string;
  source?: {
    issue?: {
      pull_request?: {
        merged_at?: string | null;
        url?: string;
      };
      user?: { login?: string };
      html_url?: string;
    };
  };
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function paginateGraphQL<T>(
  gql: ReturnType<typeof graphql.defaults>,
  query: string,
  vars: Record<string, string>,
  extractPage: (data: Record<string, unknown>) => { nodes: T[]; hasNextPage: boolean; endCursor: string | null },
  maxPages = 5
): Promise<T[]> {
  const results: T[] = [];
  let after: string | null = null;
  let page = 0;
  while (page < maxPages) {
    const data = await gql<Record<string, unknown>>(query, after ? { ...vars, after } : vars);
    const { nodes, hasNextPage, endCursor } = extractPage(data);
    results.push(...nodes);
    if (!hasNextPage) break;
    after = endCursor;
    page++;
  }
  return results;
}

export async function fetchAllMetrics(opts: FetchOptions): Promise<RawData> {
  const { user, token, noAvatar } = opts;

  const authHeaders = token ? { authorization: `token ${token}` } : {};
  const gql = graphql.defaults({ headers: authHeaders });
  const octokit = new Octokit({ auth: token || undefined });

  // 1. Issue counts
  const issueCounts = await gql<{ open: { issueCount: number }; closed: { issueCount: number } }>(ISSUES_QUERY, {
    q_open: `is:issue author:${user} is:open`,
    q_closed: `is:issue author:${user} is:closed`,
  });

  // 2. Issues list (closed only, for timeline walk - up to 200)
  interface IssueNode { number: number; state: string; title: string; url: string; repository: { nameWithOwner: string } }
  const closedIssueNodes = await paginateGraphQL<IssueNode>(
    gql,
    ISSUES_LIST_QUERY,
    { q: `is:issue author:${user} is:closed` },
    (d) => {
      const s = (d as { search: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: IssueNode[] } }).search;
      return { nodes: s.nodes, hasNextPage: s.pageInfo.hasNextPage, endCursor: s.pageInfo.endCursor };
    },
    2  // max 200 issues for timeline walk
  );

  const issuesList: RawIssue[] = closedIssueNodes.map(n => ({
    number: n.number,
    repo: n.repository.nameWithOwner,
    state: n.state as 'OPEN' | 'CLOSED',
    title: n.title,
    url: n.url,
  }));

  // 3. Also get repos from open issues
  const openIssueNodes = await paginateGraphQL<IssueNode>(
    gql,
    ISSUES_LIST_QUERY,
    { q: `is:issue author:${user} is:open` },
    (d) => {
      const s = (d as { search: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: IssueNode[] } }).search;
      return { nodes: s.nodes, hasNextPage: s.pageInfo.hasNextPage, endCursor: s.pageInfo.endCursor };
    },
    5
  );

  const reposFromIssues = [...new Set([
    ...closedIssueNodes.map(n => n.repository.nameWithOwner),
    ...openIssueNodes.map(n => n.repository.nameWithOwner),
  ])];

  // 4. PR counts
  const prCounts = await gql<{ merged: { issueCount: number }; closed: { issueCount: number } }>(PRS_QUERY, {
    q_merged: `is:pr author:${user} is:merged`,
    q_closed: `is:pr author:${user} is:closed`,
  });

  // 5. PR repos
  interface PrNode { repository: { nameWithOwner: string } }
  const prNodes = await paginateGraphQL<PrNode>(
    gql,
    PRS_REPOS_QUERY,
    { q: `is:pr author:${user}` },
    (d) => {
      const s = (d as { search: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: PrNode[] } }).search;
      return { nodes: s.nodes, hasNextPage: s.pageInfo.hasNextPage, endCursor: s.pageInfo.endCursor };
    },
    5
  );
  const reposFromPrs = [...new Set(prNodes.map(n => n.repository.nameWithOwner))];

  // 6. Comment threads
  interface CommentNode { url: string }
  const commentNodes = await paginateGraphQL<CommentNode>(
    gql,
    COMMENT_THREADS_QUERY,
    { q: `commenter:${user} -author:${user}` },
    (d) => {
      const s = (d as { search: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: CommentNode[] } }).search;
      return { nodes: s.nodes, hasNextPage: s.pageInfo.hasNextPage, endCursor: s.pageInfo.endCursor };
    },
    3
  );

  // 7. Filed-and-fixed: walk timelines of closed issues
  const filedAndFixed: FiledAndFixedEntry[] = [];
  const timelineIssues = issuesList.slice(0, 200);

  for (const issue of timelineIssues) {
    const [owner, repo] = issue.repo.split('/');
    if (!owner || !repo) continue;
    try {
      const { data: timeline } = await octokit.rest.issues.listEventsForTimeline({
        owner,
        repo,
        issue_number: issue.number,
        per_page: 100,
        mediaType: { previews: ['mockingbird'] },
      });
      for (const ev of timeline as TimelineEvent[]) {
        if (ev.event !== 'cross-referenced') continue;
        const src = ev.source?.issue;
        if (!src) continue;
        const pr = src.pull_request;
        if (!pr?.merged_at) continue;
        const prAuthor = src.user?.login || '';
        if (prAuthor.toLowerCase() === user.toLowerCase()) continue;
        if (prAuthor.endsWith('[bot]')) continue;
        filedAndFixed.push({
          issueUrl: issue.url,
          closingPrUrl: src.html_url || '',
          closingPrAuthor: prAuthor,
          repo: issue.repo,
        });
        break; // one entry per issue
      }
    } catch {
      // ignore missing timeline access for archived/private repos
    }
    await sleep(80); // respect rate limits
  }

  // 8. Avatar: fetched as base64 PNG and embedded inline.
  // Note on rendering contexts:
  //   - github.com blob view: renders correctly.
  //   - GitHub README embed via camo proxy: renders correctly in most cases.
  //   - Direct raw.githubusercontent.com URL: blocked by CSP `default-src 'none'`,
  //     falls back to initials via the template's empty-string handling.
  //   - GitHub Pages: renders correctly.
  // Pass --initials-only to skip the fetch and force the SVG-initials path
  // regardless of context.
  let avatarUrl = '';
  if (!noAvatar) {
    try {
      const { data: userData } = await octokit.rest.users.getByUsername({ username: user });
      const imgRes = await fetch(userData.avatar_url);
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const mime = imgRes.headers.get('content-type') || 'image/png';
      avatarUrl = `data:${mime};base64,${b64}`;
    } catch {
      avatarUrl = '';
    }
  }

  return {
    user,
    avatarUrl,
    avatarAlt: `@${user} avatar`,
    issuesOpen: issueCounts.open.issueCount,
    issuesClosed: issueCounts.closed.issueCount,
    issuesList,
    mergedPrCount: prCounts.merged.issueCount,
    closedPrCount: prCounts.closed.issueCount,
    reposFromIssues,
    reposFromPrs,
    commentThreadCount: commentNodes.length,
    filedAndFixed,
  };
}
