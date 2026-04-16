const child_process =
	require("node:child_process") as typeof import("node:child_process");

import type { Announcement } from "./types";

export function isInstalled(): boolean {
	try {
		child_process.execSync("gh --version", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

export function fetchIssues(repository: string, label: string): Announcement[] {
	const safeRepo = shellEscape(repository);
	const safeLabel = shellEscape(label);
	const cmd = `gh issue list --repo ${safeRepo} --label ${safeLabel} --state open --limit 100 --json title,body,number,labels,createdAt,url`;
	const raw = child_process.execSync(cmd, { encoding: "utf8" });
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed)) {
		throw new Error("gh returned unexpected non-array response");
	}
	return parsed.map((it) => ({
		number: it.number,
		title: it.title,
		body: it.body ?? "",
		labels: Array.isArray(it.labels) ? it.labels : [],
		createdAt: it.createdAt,
		url: it.url,
	}));
}

function shellEscape(value: string): string {
	if (!/^[A-Za-z0-9._\-/:]+$/.test(value)) {
		throw new Error(`Refusing to pass unsafe value to shell: ${value}`);
	}
	return value;
}
