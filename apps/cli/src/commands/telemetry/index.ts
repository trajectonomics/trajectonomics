import type { Group } from "../../command"
import { defineGroup } from "../../command"
import { off } from "./off"
import { on } from "./on"
import { status } from "./status"

export const telemetry: Group = defineGroup({
	name: "telemetry",
	summary: "Show or change anonymous usage counting",
	children: [off, on, status],
})
