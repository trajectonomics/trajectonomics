import type { Group } from "../../command"
import { defineGroup } from "../../command"
import { apply } from "./apply"
import { diff } from "./diff"
import { fork } from "./fork"
import { household } from "./household"
import { list } from "./list"
import { main } from "./main"
import { notes } from "./notes"
import { rename } from "./rename"
import { rm } from "./rm"
import { show } from "./show"
import { tax } from "./tax"

export const scenario: Group = defineGroup({
	name: "scenario",
	summary: "Manage Scenarios, the named what-ifs",
	children: [apply, diff, fork, household, list, main, notes, rename, rm, show, tax],
})
