import * as ghCli from "./ghCli";
import {
	ALL_REPOS_LABEL,
	type Announcement,
	REPO_LABEL_PREFIX,
	type RepoContext,
} from "./types";

export function filterForRepo(
	items: Announcement[],
	ctx: RepoContext | null,
): Announcement[] {
	if (!ctx) {
		return [];
	}
	return items.filter((a) => {
		const names = a.labels.map((l) => l.name);
		if (names.includes(ALL_REPOS_LABEL)) {
			return true;
		}
		return names.includes(`${REPO_LABEL_PREFIX}${ctx.repo}`);
	});
}

export function fetchAnnouncements(
	repository: string,
	label: string,
	ctx: RepoContext | null,
): Announcement[] {
	const all = ghCli.fetchIssues(repository, label);
	return filterForRepo(all, ctx);
}
