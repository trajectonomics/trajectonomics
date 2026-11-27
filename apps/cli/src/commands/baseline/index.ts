import type { Group } from "../../command"
import { defineGroup } from "../../command"
import { rates } from "./rates"
import { show } from "./show"

export const baseline: Group = defineGroup({
	name: "baseline",
	summary: "Show the Baseline a Projection starts from",
	children: [rates, show],
})
