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

/**
 * What a write stated beside its Snapshot: the batch `record-values` wrote, the household anchors and Owners a
 * plan write dropped, and whether it replaced a plan of its name made while it ran.
 */
const stated = {
	// What a write that states figures answered (`record-values`): the page shows it as traj stated it.
	result: accountValues.optional(),
	// The household anchors a plan write dropped, because the document no longer holds their item (cli ADR-0048).
	droppedAnchors: z.array(z.string()).optional(),
	// The household Owners it dropped for the same reason (cli ADR-0076).
	droppedOwners: z.array(z.string()).optional(),
	replaced: z.literal(true).optional(),
}

/** The Edit answer: the Snapshot after the Edit, or the error that stopped it, with what the write stated. */
export const editAnswer = z.discriminatedUnion("ok", [
	z.strictObject({ ok: z.literal(true), snapshot, ...stated }),
	// A refusal; or a write that landed while the read after it failed (`written_reread_failed`), with what it stated.
	z.strictObject({ ok: z.literal(false), error: errorBody, ...stated }),
])

/** The answer of a preview (`record-values` with `preview`): the dry run's result and no Snapshot, or the error. */
export const previewAnswer = z.union([
	z.strictObject({ ok: z.literal(true), preview: z.literal(true), result: accountValues }),
	refusedAnswer,
])
export type PreviewAnswer = z.infer<typeof previewAnswer>

/** One Edit answer, parsed. */
export type EditAnswer = z.infer<typeof editAnswer>
