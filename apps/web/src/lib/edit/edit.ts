/**
 * The Edits the Dashboard may send: a closed list, and each one is one `traj` write
 * ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)). The
 * page names an Edit by its kind and its values; the server builds the argv here, so nothing outside
 * this list ever runs. `edit.test.ts` pins the list and the argv of each Edit.
 */
import { z } from "zod"
import { overridesFields } from "../what-if/overrides"
import { planNameShapeError } from "./name"

/** A plan name as `traj` takes it: not empty, and never shaped like a flag (see `planNameShapeError`). */
const planName = z
	.string()
	.min(1)
	.refine((name) => planNameShapeError(name) === null, { message: "not a plan name traj can take" })

/**
 * The content hash of the plan the page read, as the Snapshot states it (`contentHash`). A write that
 * names it is refused when the stored plan has moved on (cli ADR 0055).
 */
const contentHash = z
	.string()
	.regex(/^jcs1:sha256:[0-9a-f]{64}$/, "not a content hash traj can take")

/** The kinds of Edit, in the order the list names them. */
export const EDIT_KINDS = [
	"copy-plan",
	"apply-plan",
	"delete-plan",
	"set-household",
	"remove-household",
	"apply-overrides",
] as const

/** An Edit that saves a what-if must carry at least one change: a save of nothing is not a what-if. */
const someChange = (edit: { sets: unknown[]; removals: unknown[] }) =>
	edit.sets.length + edit.removals.length > 0

/** One Edit, as the page sends it in the body of `POST /edit`. Strict: an unknown field is refused. */
export const editSchema = z.discriminatedUnion("kind", [
	z.strictObject({
		kind: z.literal("copy-plan"),
		from: planName,
		name: planName,
		// The Overrides a copy saves with (cli ADR 0056): none, and the copy is the plan as it is.
		sets: overridesFields.sets.default([]),
		removals: overridesFields.removals.default([]),
	}),
	z
		.strictObject({
			kind: z.literal("apply-overrides"),
			name: planName,
			contentHash,
			sets: overridesFields.sets,
			removals: overridesFields.removals,
		})
		.refine(someChange, { message: "a what-if applied with no change" }),
	z.strictObject({
		kind: z.literal("apply-plan"),
		name: planName,
		contentHash,
		document: z.record(z.string(), z.unknown()),
	}),
	z.strictObject({
		kind: z.literal("delete-plan"),
		name: planName,
	}),
	z.strictObject({
		kind: z.literal("set-household"),
		name: planName,
		contentHash,
		household: z.record(z.string(), z.unknown()),
	}),
	z.strictObject({
		kind: z.literal("remove-household"),
		name: planName,
		contentHash,
	}),
])

/** One Edit of the closed list. */
export type Edit = z.infer<typeof editSchema>

/** An Edit as a caller writes it: a copy's Overrides may be left out, and the server reads them as none. */
export type EditInput = z.input<typeof editSchema>

export { type WriteCommand, writeCommand } from "./command"
