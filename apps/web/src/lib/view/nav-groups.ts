import type { NavGroup } from "./routes"

/** The navigation in order: Home and Net worth, the Plan group, the Optimize group, Cash flow, Chance of success, Tax, then the Records group. */
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
				path: "/milestones/",
				label: "Milestones",
				page: "MilestonesPage",
				icon: "milestone",
				needsMilestones: true,
			},
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
			{ path: "/reports/", label: "Reports", page: "ReportsPage", icon: "file-text" },
		],
	},
	{
		heading: "Optimize",
		routes: [
			{
				path: "/optimize/allowances/",
				label: "Tax allowances",
				page: "AllowancesPage",
				icon: "sliders-horizontal",
				needsLevy: true,
			},
		],
	},
	{
		heading: null,
		routes: [
			{
				path: "/cash-flow/",
				label: "Cash flow",
				page: "CashFlowPage",
				icon: "workflow",
				needsCashflow: true,
			},
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
