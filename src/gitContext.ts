import * as vscode from 'vscode';
import { RepoContext } from './types';

const REMOTE_REGEX = /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/;

export function parseRemoteUrl(url: string): RepoContext | null {
  if (!url) { return null; }
  const match = url.match(REMOTE_REGEX);
  if (!match) { return null; }
  return { owner: match[1], repo: match[2] };
}

export async function getCurrentRepo(): Promise<RepoContext | null> {
  const gitExt = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!gitExt) { return null; }
  const git = gitExt.isActive ? gitExt.exports : await gitExt.activate();
  const api = git.getAPI(1);
  const repo = api.repositories[0];
  if (!repo) { return null; }
  const remote = repo.state.remotes.find((r) => r.name === 'origin') ?? repo.state.remotes[0];
  const url = remote?.fetchUrl ?? remote?.pushUrl ?? '';
  return parseRemoteUrl(url);
}

interface GitExtension { getAPI(version: 1): GitAPI; }
interface GitAPI { repositories: GitRepository[]; }
interface GitRepository { state: { remotes: GitRemote[] }; }
interface GitRemote { name: string; fetchUrl?: string; pushUrl?: string; }
