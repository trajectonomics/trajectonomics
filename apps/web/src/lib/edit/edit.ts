/**
 * The Edits the Dashboard may send: a closed list, and each one is one `traj` write
 * ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)). The
 * page names an Edit by its kind and its values; the server builds the argv here, so nothing outside
 * this list ever runs. `edit.test.ts` pins the list and the argv of each Edit.
 */
import { z } from "zod"
import { planNameShapeError } from "./name"

/** A plan name as `traj` takes it: not empty, and never shaped like a flag (see `planNameShapeError`). */
const planName = z
	.string()
	.min(1)
	.refine((name) => planNameShapeError(name) === null, { message: "not a plan name traj can take" })

/**
 * The content hash of the plan the page read, as the Snapshot states it (`contentHash`). A write that
 * names it is refused when the stored plan has moved on (cli ADR 0051).
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
] as const

/** One Edit, as the page sends it in the body of `POST /edit`. Strict: an unknown field is refused. */
export const editSchema = z.discriminatedUnion("kind", [
	z.strictObject({
		kind: z.literal("copy-plan"),
		from: planName,
		name: planName,
	}),
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

/** The argv of one write, which ends with `--json`, and the standard input the write reads. */
export type WriteCommand = { argv: string[]; stdin?: string }

/**
 * The `traj` write an Edit runs. With `dryRun`, the argv carries `--dry-run`, so the write runs and is
 * rolled back ([cli ADR 0019](../../../../cli/docs/adr/0019-dry-run-executes-and-rolls-back.md)). The
 * writes that change a plan name the hash the page read with `--if-hash` (cli ADR 0051).
 */
export function writeCommand(edit: Edit, dryRun: boolean): WriteCommand {
	const flags = dryRun ? ["--dry-run", "--json"] : ["--json"]
	switch (edit.kind) {
		case "copy-plan":
			return { argv: ["scenario", "fork", edit.from, edit.name, ...flags] }
		case "apply-plan":
			// The page holds decimal-form documents only, so the write reads that form (ADR-0047).
			return {
				argv: [
					"scenario",
					"apply",
					edit.name,
					"--file",
					"-",
					"--decimal",
					"--if-hash",
					edit.contentHash,
					...flags,
				],
				stdin: JSON.stringify(edit.document),
			}
		case "delete-plan":
			return { argv: ["scenario", "rm", edit.name, ...flags] }
		case "set-household":
			// The household document is read from stdin, and its anchored dates are written (cli ADR-0048).
			return {
				argv: [
					"scenario",
					"household",
					edit.name,
					"--file",
					"-",
					"--if-hash",
					edit.contentHash,
					...flags,
				],
				stdin: JSON.stringify(edit.household),
			}
		case "remove-household":
			return {
				argv: [
					"scenario",
					"household",
					edit.name,
					"--none",
					"--if-hash",
					edit.contentHash,
					...flags,
				],
			}
	}
}
