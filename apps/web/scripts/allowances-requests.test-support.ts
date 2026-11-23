// The page's requests to the loopback editor of the allowances test, and the answers parsed as the page parses them.
import { type EditAnswer, editAnswer } from "../src/lib/edit/answer"
import { type WhatIfAnswer, whatIfAnswer } from "../src/lib/what-if/answer"
import { editorOf, PLAN } from "./allowances-ledger.test-support"
import { editRequest } from "./edit-request.test-support"

const PORT = 4321

/** `POST /edit` or `POST /reread`: the answer is the new Snapshot, or the error as data. */
export async function post(route: "edit" | "reread", body: unknown): Promise<EditAnswer> {
	const response = await editorOf()[route](editRequest({}, JSON.stringify(body)), PORT)
	return editAnswer.parse(await response.json())
}

/** `POST /what-if`: the four reads of the what-if. */
export async function tryWhatIf(body: unknown): Promise<WhatIfAnswer> {
	const response = await editorOf().whatIf(editRequest({}, JSON.stringify(body)), PORT)
	return whatIfAnswer.parse(await response.json())
}

/** The Snapshot of an answer that ran, or a thrown reason. */
export function snapshotOf(answer: EditAnswer) {
	if (!answer.ok) throw new Error(answer.error.message)
	return answer.snapshot
}

/** The allowances read of the plan in an answer's Snapshot: its data, or a thrown reason. */
export function allowancesOf(answer: EditAnswer, name = PLAN) {
	const read = snapshotOf(answer).reads.allowances[name]
	if (read === undefined || !read.ok)
		throw new Error(read?.ok === false ? read.error.message : "no read")
	return read.data
}
