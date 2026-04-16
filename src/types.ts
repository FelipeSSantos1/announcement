export interface GitHubLabel {
  name: string;
  color?: string;
  description?: string;
}

export interface Announcement {
  number: number;
  title: string;
  body: string;
  labels: GitHubLabel[];
  createdAt: string;
  url: string;
}

export interface RepoContext {
  owner: string;
  repo: string;
}

export interface AnnouncementConfig {
  repository: string;
  label: string;
  refreshInterval: number;
}

export const ALL_REPOS_LABEL = 'all-repos';
export const REPO_LABEL_PREFIX = 'repo:';
