import type { NavGroup } from "./routes"

/** The Optimize group, then the Estate page after it. */
export const OPTIMIZE_GROUPS: readonly NavGroup[] = [
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
			{
				path: "/optimize/withdrawals/",
				label: "Withdrawals",
				page: "WithdrawalsPage",
				icon: "wallet",
				needsDocument: true,
			},
		],
	},
	{
		heading: null,
		routes: [
			{
				path: "/estate/",
				label: "Estate",
				page: "EstatePage",
				icon: "landmark",
				needsDocument: true,
			},
		],
	},
]
