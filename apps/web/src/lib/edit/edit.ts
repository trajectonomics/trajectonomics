/**
 * The Edits the Dashboard may send: a closed list, and each one is one `traj` write
 * ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)), apart from a
 * guided first plan, which writes the plan and then its household ([ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * The page names an Edit by its kind and its values; the server builds the argv here, so nothing outside
 * this list ever runs. `edit.test.ts` pins the list and the argv of each Edit.
 */
import { z } from "zod"
import { overridesFields } from "../what-if/overrides"
import { contentHash, householdHash, planName } from "./fields"
import { guidedEditSchema } from "./guided-edit"
import { planEditSchemas, startPlanSchema } from "./plan-edits"
import { recordValuesSchema } from "./record-values"
import { taxFlags } from "./tax-flags"
import { taxLabels } from "./tax-labels"

/** The kinds of Edit, in the order the list names them. */
export const EDIT_KINDS = [
	"copy-plan",
	"apply-plan",
	"delete-plan",
	"set-household",
	"remove-household",
	"apply-overrides",
	"merge-tax",
	"set-tax",
	"remove-tax",
	"rename-plan",
	"set-plan-notes",
	"set-main-plan",
	"record-values",
	"start-guided-plan",
] as const

/** An Edit that saves a what-if must carry at least one change: a save of nothing is not a what-if. */
const someChange = (edit: { sets: unknown[]; removals: unknown[]; additions: unknown[] }) =>
	edit.sets.length + edit.removals.length + edit.additions.length > 0

/** The Edits that name a kind and a plan the page read. Strict: an unknown field is refused. */
const savedEdit = z.discriminatedUnion("kind", [
	z.strictObject({
		kind: z.literal("copy-plan"),
		from: planName,
		name: planName,
		// The Overrides a copy saves with (cli ADR 0056): none, and the copy is the plan as it is.
		sets: overridesFields.sets.default([]),
		removals: overridesFields.removals.default([]),
		additions: overridesFields.additions.default([]),
	}),
	z
		.strictObject({
			kind: z.literal("apply-overrides"),
			name: planName,
			contentHash,
			sets: overridesFields.sets,
			removals: overridesFields.removals,
			additions: overridesFields.additions.default([]),
		})
		.refine(someChange, { message: "a what-if applied with no change" }),
	z.strictObject({
		kind: z.literal("apply-plan"),
		name: planName,
		contentHash,
		document: z.record(z.string(), z.unknown()),
	}),
	...planEditSchemas,
	z.strictObject({
		kind: z.literal("delete-plan"),
		name: planName,
	}),
	z.strictObject({
		kind: z.literal("set-household"),
		name: planName,
		householdHash,
		household: z.record(z.string(), z.unknown()),
	}),
	z.strictObject({
		kind: z.literal("remove-household"),
		name: planName,
		householdHash,
	}),
	// The tax profile (cli ADR 0066): a merge changes the items it names, a set states the whole profile, a remove takes it out.
	z.strictObject({
		kind: z.literal("merge-tax"),
		name: planName,
		contentHash,
		flags: taxFlags.refine((flags) => Object.keys(flags).length > 0, {
			message: "a merge that changes nothing",
		}),
	}),
	z.strictObject({
		kind: z.literal("set-tax"),
		name: planName,
		contentHash,
		flags: taxFlags.required({ filingStatus: true }),
		// The labels of income Flows that have none: a plan with no Levy takes its labels in the write that gives it one.
		labels: taxLabels.default([]),
	}),
	z.strictObject({
		kind: z.literal("remove-tax"),
		name: planName,
		contentHash,
	}),
	// The first write to the ledger itself: values stated as of a date, which traj turns into Transactions (cli ADR 0072).
	recordValuesSchema,
	// A guided first plan: the one Edit that runs two writes, the plan and then its household (web ADR 0031).
	guidedEditSchema,
])

/**
 * One Edit, as the page sends it in the body of `POST /edit`: one of those, or a plan started from the ledger's
 * accounts, which is an `apply-plan` with a template and no document.
 */
export const editSchema = z.union([savedEdit, startPlanSchema])

/** One Edit of the closed list. */
export type Edit = z.infer<typeof editSchema>

/** An Edit as a caller writes it: a copy's Overrides may be left out, and the server reads them as none. */
export type EditInput = z.input<typeof editSchema>

export { type WriteCommand, writeCommand } from "./command"
