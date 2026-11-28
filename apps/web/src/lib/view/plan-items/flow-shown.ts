import type { ErrorBody } from "../../contract"
import { employerIdOf } from "./employer"
import { FLOW_FIELDS } from "./fields"
import { type Problems, type Shown, shownProblems } from "./problems"
import { namedRefusal } from "./refusal"

/** What a Flow form's last save left: its own problems, the CLI's refusal and message, and what it sent. */
export interface FlowAnswer {
	problems: Problems
	failure: ErrorBody | null
	message: string | null
	/** The ids of the Flows of the document the Edit sent, in order, which a refusal's position in its path names. */
	sent: readonly string[]
}

/** The Flows a form's plan holds, and the id of the one it edits, absent for a new one. */
export interface FlowEdited {
	held: string | undefined
	flows: readonly { id: string }[]
}

/**
 * What the Flow form shows: a refusal at the Flow it edits, or at the one the last save sent as new, or at the employer's
 * Flow it carries, lands at a field.
 */
export function flowShown(answer: FlowAnswer, edited: FlowEdited): Shown {
	const { problems, failure, message, sent } = answer
	const added = () => sent.find((one) => !edited.flows.some((flow) => flow.id === one))
	const id = edited.held ?? added() ?? ""
	const refusal = namedRefusal(failure, sent)
	const item = ["flows", id]
	const employer = ["flows", employerIdOf(id)]
	return shownProblems(problems, refusal, message, FLOW_FIELDS, item, employer)
}
