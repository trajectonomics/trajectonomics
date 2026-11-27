/** The licence every first-party workspace package declares. */
export const LICENCE = "AGPL-3.0-only"

/** One workspace package and the licence its `package.json` states, if any. */
export interface Workspace {
	readonly directory: string
	readonly license: string | undefined
}

/** The workspaces that do not declare the repository licence, each with what it declares instead. */
export function wrongLicences(workspaces: readonly Workspace[]): string[] {
	return workspaces
		.filter((workspace) => workspace.license !== LICENCE)
		.map((workspace) => `${workspace.directory}: ${workspace.license ?? "no license field"}`)
}
