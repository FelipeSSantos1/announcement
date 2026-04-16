import { Announcement, RepoContext, ALL_REPOS_LABEL, REPO_LABEL_PREFIX } from './types';
import * as ghCli from './ghCli';

export function filterForRepo(items: Announcement[], ctx: RepoContext | null): Announcement[] {
  if (!ctx) { return []; }
  return items.filter((a) => {
    const names = a.labels.map((l) => l.name);
    if (names.includes(ALL_REPOS_LABEL)) { return true; }
    return names.includes(`${REPO_LABEL_PREFIX}${ctx.repo}`);
  });
}

export function fetchAnnouncements(repository: string, label: string, ctx: RepoContext | null): Announcement[] {
  const all = ghCli.fetchIssues(repository, label);
  return filterForRepo(all, ctx);
}
