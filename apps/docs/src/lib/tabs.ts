/**
 * URL path the Docs Portal is served under: the Site's `/docs` mount (ADR 0017), so a page is
 * `/docs/cli/`.
 */
export const DOCS_BASE_PATH = "/docs"

/** A top-level Tab of the Docs Portal, addressed to exactly one audience. */
export interface TabDefinition {
	/** Folder under `src/content/docs/`, also the first URL segment of the Tab. */
	readonly folder: string
	readonly title: string
	readonly audience: "Operator" | "Contributor"
	/** The Landing Page entry that sends this Tab's audience here. */
	readonly entry: string
	/** The Landing Page line under the entry saying what the reader gets and where it starts. */
	readonly description: string
}

/** The content folder of the Operator tab, whose pages document the `cli` release. */
export const OPERATOR_TAB_CONTENT = "cli"

/** The two Tabs of the Docs Portal, the Operator tab first. */
export const TABS: readonly [TabDefinition, TabDefinition] = [
	{
		folder: "cli",
		title: "CLI & Quickstart",
		audience: "Operator",
		entry: "For Operators: install and run the CLI",
		description: "Install traj, then record your first transaction and read your balance.",
	},
	{
		folder: "contribute",
		title: "Contribute",
		audience: "Contributor",
		entry: "For Contributors: help make the tax rules right",
		description: "Report a wrong figure, add a tax year or a country, and check your change.",
	},
]

/** Absolute URL path of a Tab's index page, with a trailing slash. */
export function tabUrl(tab: TabDefinition): string {
	return `${DOCS_BASE_PATH}/${tab.folder}/`
}

/** An audience name a reader may type as a URL, and the Tab it leads to. */
export interface TabAlias {
	/** The path below the Docs Portal base, without a trailing slash. */
	readonly path: string
	readonly tab: TabDefinition
}

/**
 * The audience names a reader may type, and the Tab each one means. They are not a front-door
 * redirect: `/` stays on the Landing Page, which sends each audience to its own Tab.
 */
export const TAB_ALIASES: readonly [TabAlias, TabAlias, TabAlias] = [
	{ path: "/operators", tab: TABS[0] },
	{ path: "/contributors", tab: TABS[1] },
	// The audience name the Builder tab answered to. It now reaches the Contribute Tab.
	{ path: "/builders", tab: TABS[1] },
]

/** Whether `pathname` is a page of the Tab `tab`, its index page included, with or without its trailing slash. */
export function isTabPath(tab: TabDefinition, pathname: string): boolean {
	const index = `${DOCS_BASE_PATH}/${tab.folder}`
	return pathname === index || pathname.startsWith(`${index}/`)
}

/** URL path of the static search index, exported at build time (see `pages/api/search.json.ts`). */
export const SEARCH_INDEX_PATH = `${DOCS_BASE_PATH}/api/search.json`

/** URL path of the Docs index, exported at build time (see `pages/llms.txt.ts`). */
export const DOCS_INDEX_PATH = `${DOCS_BASE_PATH}/llms.txt`

/** URL path of the static Sitemap, exported at build time (see `pages/sitemap.xml.ts`). */
export const SITEMAP_PATH = `${DOCS_BASE_PATH}/sitemap.xml`
