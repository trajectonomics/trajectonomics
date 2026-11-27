import type { NavGroup } from "./routes"

/** Cash flow, Chance of success and Tax: the pages about the money a year moves and the money it costs. */
export const MONEY_GROUP: NavGroup = {
	heading: null,
	routes: [
		{
			path: "/cash-flow/",
			label: "Cash flow",
			page: "CashFlowPage",
			icon: "workflow",
			needsCashflow: true,
		},
		{ path: "/chance/", label: "Chance of success", page: "ChancePage", icon: "target" },
		{ path: "/tax/", label: "Tax", page: "TaxPage", icon: "receipt" },
	],
}
