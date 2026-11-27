import type { NavGroup } from "./routes"

/** The Optimize group: what the plan could do with its tax allowances, its withdrawals and its estate. */
export const OPTIMIZE_GROUP: NavGroup = {
	heading: "Optimize",
	collapsible: true,
	defaultOpen: true,
	routes: [
		{
			path: "/optimize/allowances/",
			label: "Tax allowances",
			page: "AllowancesPage",
			icon: "sliders-horizontal",
			needsLevy: true,
		},
		{
			path: "/optimize/withdrawals/",
			label: "Withdrawals",
			page: "WithdrawalsPage",
			icon: "wallet",
			needsDocument: true,
		},
		{
			path: "/estate/",
			label: "Estate",
			page: "EstatePage",
			icon: "landmark",
			needsDocument: true,
		},
	],
}
