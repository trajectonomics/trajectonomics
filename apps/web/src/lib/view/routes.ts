/** The icons the navigation draws, by their Lucide names. Each is defined in `src/components/shell/nav-icons.ts`. */
export type IconName =
	| "activity"
	| "book-open"
	| "calendar"
	| "chart-line"
	| "git-compare"
	| "house"
	| "landmark"
	| "menu"
	| "receipt"
	| "sliders-horizontal"
	| "target"
	| "trending-down"
	| "trending-up"
	| "wallet"
	| "x"

/**
 * One page of the Dashboard: its path, its label in the navigation, the page component, and its icon.
 * A page that edits a plan's items needs that plan's document, so it is listed only when the Snapshot holds it.
 */
export interface Route {
	readonly path: string
	readonly label: string
	readonly page: string
	readonly icon: IconName
	readonly needsDocument?: true
}

/** A run of pages under one heading. A heading of null is a run of pages that belong to no group. */
export interface NavGroup {
	readonly heading: string | null
	readonly routes: readonly Route[]
}

/** The navigation in order: Home and Net worth, the Plan group, Chance of success, Tax, then the Records group. */
export const NAV_GROUPS: readonly NavGroup[] = [
	{
		heading: null,
		routes: [
			{ path: "/", label: "Home", page: "OverviewPage", icon: "house" },
			{ path: "/net-worth/", label: "Net worth", page: "NetWorthPage", icon: "wallet" },
		],
	},
	{
		heading: "Plan",
		routes: [
			{ path: "/projection/", label: "Overview", page: "ProjectionPage", icon: "chart-line" },
			{
				path: "/income/",
				label: "Income",
				page: "IncomePage",
				icon: "trending-up",
				needsDocument: true,
			},
			{
				path: "/expenses/",
				label: "Expenses",
				page: "ExpensesPage",
				icon: "trending-down",
				needsDocument: true,
			},
			{
				path: "/assets-and-debts/",
				label: "Assets and debts",
				page: "AssetsDebtsPage",
				icon: "landmark",
				needsDocument: true,
			},
			{ path: "/fi/", label: "FI date", page: "FiPage", icon: "calendar" },
			{ path: "/compare/", label: "Compare", page: "ComparePage", icon: "git-compare" },
		],
	},
	{
		heading: null,
		routes: [{ path: "/chance/", label: "Chance of success", page: "ChancePage", icon: "target" }],
	},
	{
		heading: null,
		routes: [{ path: "/tax/", label: "Tax", page: "TaxPage", icon: "receipt" }],
	},
	{
		heading: "Records",
		routes: [
			{ path: "/ledger/", label: "Ledger", page: "LedgerPage", icon: "book-open" },
			{ path: "/health/", label: "Health", page: "HealthPage", icon: "activity" },
		],
	},
]

/** The pages in navigation order, as one flat list. */
export const ROUTES: readonly Route[] = NAV_GROUPS.flatMap((group) => group.routes)

/** The page at a path, such as "/net-worth/", or undefined when no page has that path. */
export function routeAt(path: string): Route | undefined {
	return ROUTES.find((route) => route.path === path)
}

/** The routes of a group the navigation lists: a page that needs a plan's document is left out without one. */
export function routesShown(group: NavGroup, planDocument: boolean): readonly Route[] {
	return group.routes.filter((route) => planDocument || route.needsDocument !== true)
}
