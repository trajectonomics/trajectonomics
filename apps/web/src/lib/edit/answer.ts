/**
 * What the server answers to the page: the session token, and the outcome of an Edit. An Edit that ran
 * answers the new Snapshot, or the CLI's error envelope as data; a refused request answers the same
 * error shape with the refusal in it ([guard.ts](guard.ts)).
 */
import { z } from "zod"
import { accountValues, errorBody, snapshot } from "../contract"

/** The session answer: the token the page sends in `EDIT_TOKEN_HEADER`. */
export const sessionAnswer = z.strictObject({ token: z.string().min(1) })

/** The answer of an Edit that did not run: the error that stopped it, as the CLI stated it. */
const refusedAnswer = z.strictObject({ ok: z.literal(false), error: errorBody })

/** The Edit answer: the Snapshot after the Edit, or the error that stopped it. */
export const editAnswer = z.discriminatedUnion("ok", [
	// `result` is what a write that states figures answered (`record-values`): the page shows it as traj stated it.
	// `droppedAnchors` names the household anchors a plan write dropped, because the document no longer holds their item (cli ADR-0048).
	z.strictObject({
		ok: z.literal(true),
		snapshot,
		result: accountValues.optional(),
		droppedAnchors: z.array(z.string()).optional(),
	}),
	refusedAnswer,
])

/** The answer of a preview (`record-values` with `preview`): the dry run's result and no Snapshot, or the error. */
export const previewAnswer = z.union([
	z.strictObject({ ok: z.literal(true), preview: z.literal(true), result: accountValues }),
	refusedAnswer,
])
export type PreviewAnswer = z.infer<typeof previewAnswer>

/** One Edit answer, parsed. */
export type EditAnswer = z.infer<typeof editAnswer>
