import type { Group } from "../../command"
import { defineGroup } from "../../command"
import { add } from "./add"
import { close } from "./close"
import { list } from "./list"
import { show } from "./show"
import { value } from "./value"

export const account: Group = defineGroup({
	name: "account",
	summary: "Manage the chart of accounts",
	children: [add, close, list, show, value],
})
