import { NAV_GROUPS } from "./nav-groups"

/** The icons the navigation draws, by their Lucide names. Each is defined in `src/components/shell/nav-icons.ts`. */
export type IconName =
	| "activity"
	| "book-open"
	| "calendar"
	| "chart-line"
	| "eye"
	| "eye-off"
	| "file-text"
	| "git-compare"
	| "house"
	| "landmark"
	| "menu"
	| "milestone"
	| "receipt"
	| "sliders-horizontal"
	| "target"
	| "trending-down"
	| "trending-up"
	| "wallet"
	| "workflow"
	| "x"

/**
 * One page of the Dashboard: its path, its label, the page component and its icon. A page that needs the
 * selected plan's document, or its milestones, is listed only when the Snapshot holds them.
 */
export interface Route {
	readonly path: string
	readonly label: string
	readonly page: string
	readonly icon: IconName
	readonly needsDocument?: true
	readonly needsMilestones?: true
	readonly needsCashflow?: true
	readonly needsLevy?: true
}

/** A run of pages under one heading. A heading of null is a run of pages that belong to no group. */
export interface NavGroup {
	readonly heading: string | null
	readonly routes: readonly Route[]
}

export { NAV_GROUPS }

/** The pages in navigation order, as one flat list. */
export const ROUTES: readonly Route[] = NAV_GROUPS.flatMap((group) => group.routes)

/** The page at a path, such as "/net-worth/", or undefined when no page has that path. */
export function routeAt(path: string): Route | undefined {
	return ROUTES.find((route) => route.path === path)
}

/**
 * The routes of a group the navigation lists: a page that needs a document, milestones or the cash flow
 * table is left out without them.
 */
export function routesShown(
	group: NavGroup,
	planDocument: boolean,
	milestones = true,
	cashflow = true,
	levy = true,
): readonly Route[] {
	return group.routes.filter(
		(route) =>
			(planDocument || route.needsDocument !== true) &&
			(milestones || route.needsMilestones !== true) &&
			(cashflow || route.needsCashflow !== true) &&
			(levy || route.needsLevy !== true),
	)
}

/** Pages that are opened from a page in the navigation and are not listed in it: each stands under its parent. */
const CHILD_PAGES: Readonly<Record<string, string>> = { "/chance/path/": "/chance/" }

/** The navigation's page a path belongs to: the page itself, or the parent of a page opened from it. */
export function navPath(path: string): string {
	return CHILD_PAGES[path] ?? path
}

/** The titles of pages that are in no navigation group, by path. */
const OTHER_TITLES: Readonly<Record<string, string>> = { "/plans/": "Plans" }

/** The heading of the page at a path: its navigation label, or the title of a page the navigation does not list. */
export function pageTitle(path: string): string {
	return OTHER_TITLES[path] ?? routeAt(navPath(path))?.label ?? "Dashboard"
}
