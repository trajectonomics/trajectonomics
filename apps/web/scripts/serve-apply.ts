// One Edit's own run: the dry write first, then the real one ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
// A plan started from the ledger's accounts first reads the template it applies.
import { z } from "zod"
import type { ErrorBody } from "../src/lib/contract"
import { type Edit, writeCommand } from "../src/lib/edit/edit"
import { templateRead } from "../src/lib/edit/plan-command"
import { type RunContext, runTraj } from "./run-traj"

/** Whether the Edit starts a plan from the ledger's accounts, so the server reads the template first. */
function startsPlan(edit: Edit): edit is Extract<Edit, { template: unknown }> {
	return edit.kind === "apply-plan" && "template" in edit
}

/** The CLI's own answer to a dry run of an apply: `created` when no plan of the name was stored. */
const applyStatus = z.looseObject({ status: z.string() })

/** The anchors an apply dropped (cli ADR-0048): `scenario apply` and `scenario fork` state them (cli ADR 0076). */
const droppedStatement = z.looseObject({ droppedAnchors: z.array(z.string()) })

/** What one Edit's run came to: it ran (with the household anchors the write dropped), or the error that stopped it. */
export type EditRun =
	| { readonly ok: true; readonly droppedAnchors: readonly string[] }
	| { readonly ok: false; readonly error: ErrorBody }

/** The exit code `traj` gives a taken name (cli ADR-0021: a conflict with what the ledger holds). */
const NAME_TAKEN_EXIT_CODE = 5

/** The refusal of a new plan whose name is taken: the page checks the names, and this holds when a terminal took it since. */
function nameTaken(name: string): ErrorBody {
	return {
		code: "scenario_name_taken",
		exitCode: NAME_TAKEN_EXIT_CODE,
		message: `A plan named ${name} already exists.`,
	}
}

/** Whether a write's answer says the plan was created, as a new plan's must. */
function wasCreated(data: unknown): boolean {
	const status = applyStatus.safeParse(data)
	return status.success && status.data.status === "created"
}

/** Runs one Edit, dry and then real. It ran, or it is the CLI's error (or the refusal) as data. */
export async function runEdit(context: RunContext, edit: Edit): Promise<EditRun> {
	const stopped = (error: ErrorBody): EditRun => ({ ok: false, error })
	let template: string | undefined
	if (startsPlan(edit)) {
		const read = await runTraj(context, templateRead(edit.template.asOf), z.string())
		if (!read.ok) return stopped(read.error)
		template = read.data
	}
	const run = (dryRun: boolean) => {
		const command = writeCommand(edit, dryRun, template)
		return runTraj(context, command.argv, z.unknown(), command.stdin)
	}
	const dry = await run(true)
	if (!dry.ok) return stopped(dry.error)
	// A new plan must be new: `scenario apply` under a taken name would replace that plan's document.
	if (startsPlan(edit) && !wasCreated(dry.data)) return stopped(nameTaken(edit.name))
	const real = await run(false)
	if (!real.ok) return stopped(real.error)
	// A plan of the name made between the dry run and this write (a window of milliseconds) is replaced: say so, as the write is done.
	if (startsPlan(edit) && !wasCreated(real.data)) {
		const message = `A plan named ${edit.name} was made while this ran, and this write replaced it.`
		return stopped({ ...nameTaken(edit.name), message })
	}
	const dropped = droppedStatement.safeParse(real.data)
	return { ok: true, droppedAnchors: dropped.success ? dropped.data.droppedAnchors : [] }
}
