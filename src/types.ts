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
	label: string;
	refreshInterval: number;
}
