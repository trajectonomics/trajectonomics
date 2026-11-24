/**
 * The Edits that manage plans, apart from copy and delete: rename, notes, the main plan, and a new plan from
 * the ledger ([web ADR 0021](../../../docs/adr/0021-the-plans-page-shows-every-plan-side-by-side.md)).
 */
import { z } from "zod"
import { dateString } from "../contract/date"
import { contentHash, planName } from "./fields"
import { notesError } from "./notes"

/** The notes a write states. The empty text clears them, and `traj` takes no empty notes. */
const notes = z.string().refine((text) => notesError(text) === null, "not notes traj can take")

/** `scenario rename`, `scenario notes` and `scenario main`: each is one write on one plan. */
export const planEditSchemas = [
	z.strictObject({
		kind: z.literal("rename-plan"),
		name: planName,
		newName: planName,
		contentHash,
	}),
	z.strictObject({ kind: z.literal("set-plan-notes"), name: planName, notes }),
	z.strictObject({ kind: z.literal("set-main-plan"), name: planName }),
] as const

/**
 * A plan started from the ledger's accounts at the As-of: an `apply-plan` with the template in place of a
 * document. It names no hash, because the plan does not exist yet; the server refuses it when the name is taken.
 */
export const startPlanSchema = z.strictObject({
	kind: z.literal("apply-plan"),
	name: planName,
	template: z.strictObject({ asOf: dateString }),
})
