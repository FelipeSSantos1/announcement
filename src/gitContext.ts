import * as vscode from "vscode";
import type { RepoContext } from "./types";

const REMOTE_REGEX = /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/;

export function parseRemoteUrl(url: string): RepoContext | null {
	if (!url) {
		return null;
	}
	const match = url.match(REMOTE_REGEX);
	if (!match) {
		return null;
	}
	return { owner: match[1], repo: match[2] };
}

export async function onDidOpenRepository(
	callback: () => void,
): Promise<vscode.Disposable | null> {
	const gitExt = vscode.extensions.getExtension<GitExtension>("vscode.git");
	if (!gitExt) {
		return null;
	}
	const git = gitExt.isActive ? gitExt.exports : await gitExt.activate();
	const api = git.getAPI(1);
	return api.onDidOpenRepository(callback);
}

export async function getCurrentRepo(
	fileUri?: vscode.Uri,
): Promise<RepoContext | null> {
	const gitExt = vscode.extensions.getExtension<GitExtension>("vscode.git");
	if (!gitExt) {
		return null;
	}
	const git = gitExt.isActive ? gitExt.exports : await gitExt.activate();
	const api = git.getAPI(1);
	const repo = fileUri ? api.getRepository(fileUri) : null;
	const chosen = repo ?? api.repositories[0];
	if (!chosen) {
		return null;
	}
	const remote =
		chosen.state.remotes.find((r) => r.name === "origin") ??
		chosen.state.remotes[0];
	const url = remote?.fetchUrl ?? remote?.pushUrl ?? "";
	return parseRemoteUrl(url);
}

interface GitExtension {
	getAPI(version: 1): GitAPI;
}
interface GitAPI {
	repositories: GitRepository[];
	getRepository(uri: vscode.Uri): GitRepository | null;
	onDidOpenRepository: vscode.Event<GitRepository>;
}
interface GitRepository {
	state: { remotes: GitRemote[] };
}
interface GitRemote {
	name: string;
	fetchUrl?: string;
	pushUrl?: string;
}
