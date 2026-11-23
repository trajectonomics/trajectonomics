// The page's requests to the loopback editor of the withdrawals test, and the answers parsed as the page parses them.
import { type EditAnswer, editAnswer } from "../src/lib/edit/answer"
import { type WhatIfAnswer, whatIfAnswer } from "../src/lib/what-if/answer"
import { editRequest } from "./edit-request.test-support"
import { editorOf } from "./withdrawals-ledger.test-support"

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
