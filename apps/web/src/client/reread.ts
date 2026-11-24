import { editAnswer } from "../lib/edit/answer"
import { EDIT_TOKEN_HEADER, REREAD_PATH } from "../lib/edit/guard"
import type { AllowancePlan } from "../lib/snapshot/allowance-params"
import type { ChanceInputs } from "../lib/snapshot/chance-params"
import { replaceSnapshot } from "./snapshot.svelte.js"

/** The body of `POST /reread`: nothing, or the inputs of the allowance reads, or the paths and seed of the chance reads. */
export type RereadBody = { allowances?: AllowancePlan | null; chance?: ChanceInputs }

/**
 * Posts a reread and shows the Snapshot it answers with. The answer is ok, or the sentence a person reads: the CLI's
 * error as it came, or why the server could not be reached or read.
 */
export async function postReread(
	token: string,
	body: RereadBody,
): Promise<{ ok: true } | { ok: false; message: string }> {
	try {
		const response = await fetch(REREAD_PATH, {
			method: "POST",
			headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: token },
			body: JSON.stringify(body),
			cache: "no-store",
		})
		const answer = editAnswer.safeParse(await response.json())
		if (!answer.success)
			return { ok: false, message: "The Dashboard could not read the answer to the Edit." }
		if (!answer.data.ok) return { ok: false, message: answer.data.error.message }
		replaceSnapshot(answer.data.snapshot)
		return { ok: true }
	} catch {
		return { ok: false, message: "The Dashboard could not reach traj. Try again." }
	}
}
