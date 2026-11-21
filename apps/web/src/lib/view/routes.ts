/** One page of the Dashboard: its path, its label in the navigation, and the page component that renders it. */
export interface Route {
	readonly path: string
	readonly label: string
	readonly page: string
}

/** The eight pages, in navigation order. Each path has a route file that mounts its page component. */
export const ROUTES: readonly Route[] = [
	{ path: "/", label: "Overview", page: "OverviewPage" },
	{ path: "/net-worth/", label: "Net worth", page: "NetWorthPage" },
	{ path: "/ledger/", label: "Ledger", page: "LedgerPage" },
	{ path: "/projection/", label: "Projection", page: "ProjectionPage" },
	{ path: "/fi/", label: "FI date", page: "FiPage" },
	{ path: "/compare/", label: "Compare", page: "ComparePage" },
	{ path: "/tax/", label: "Tax", page: "TaxPage" },
	{ path: "/health/", label: "Health", page: "HealthPage" },
]
