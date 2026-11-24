import type { NavGroup } from "./routes"

/** Cash flow, and Where money goes after it: where each year's money went, and the order it goes in. */
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
		{
			path: "/routing/",
			label: "Where money goes",
			page: "RoutingPage",
			icon: "workflow",
			needsDocument: true,
		},
	],
}
