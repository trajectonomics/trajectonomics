import { MONEY_GROUP } from "./nav-money"
import { OPTIMIZE_GROUP } from "./nav-optimize"
import type { NavGroup } from "./routes"

/**
 * The navigation in order: Overview and Net worth, the Plan group, the money pages (Cash flow, Chance of
 * success and Tax), the Optimize group, then the Records and Settings groups. The pages that are opened
 * from another page but are not listed here are still routable; `CHILD_PAGES` in `routes.ts` marks the
 * entry they belong to.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
	{
		heading: null,
		routes: [
			{ path: "/", label: "Overview", page: "OverviewPage", icon: "house" },
			{ path: "/net-worth/", label: "Net worth", page: "NetWorthPage", icon: "wallet" },
		],
	},
	{
		heading: "Plan",
		collapsible: true,
		defaultOpen: true,
		routes: [
			{ path: "/projection/", label: "Plan", page: "ProjectionPage", icon: "chart-line" },
			{
				path: "/milestones/",
				label: "Milestones",
				page: "MilestonesPage",
				icon: "milestone",
				needsMilestones: true,
			},
			{ path: "/compare/", label: "Compare plans", page: "ComparePage", icon: "git-compare" },
			{ path: "/reports/", label: "Reports", page: "ReportsPage", icon: "file-text" },
		],
	},
	MONEY_GROUP,
	OPTIMIZE_GROUP,
	{
		heading: "Records",
		collapsible: true,
		defaultOpen: false,
		routes: [
			{ path: "/ledger/", label: "Ledger", page: "LedgerPage", icon: "book-open" },
			{ path: "/health/", label: "Health", page: "HealthPage", icon: "activity" },
		],
	},
	{
		heading: "Settings",
		collapsible: true,
		defaultOpen: false,
		routes: [
			{
				path: "/settings/tax/",
				label: "Tax profile",
				page: "TaxSettingsPage",
				icon: "sliders-horizontal",
				needsDocument: true,
			},
			{
				path: "/settings/assumptions/",
				label: "Assumptions",
				page: "AssumptionsPage",
				icon: "sliders-horizontal",
				needsDocument: true,
			},
			{
				path: "/settings/display/",
				label: "Display",
				page: "DisplaySettingsPage",
				icon: "sliders-horizontal",
			},
		],
	},
]
