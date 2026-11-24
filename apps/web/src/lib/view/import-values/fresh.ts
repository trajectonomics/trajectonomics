import type { AccountValues } from "../../contract"
import type { Matches } from "./match"
import { IDLE } from "./preview"
import type { StepName } from "./steps"

/** What a closed wizard holds: nothing of the draft. */
export const FRESH = {
	open: false,
	step: "load" as StepName,
	text: "",
	fileName: null as string | null,
	fileProblem: null as string | null,
	matches: {} as Matches,
	preview: IDLE,
	saved: null as AccountValues | null,
}
