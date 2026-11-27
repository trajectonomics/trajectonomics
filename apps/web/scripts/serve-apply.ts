// One Edit's own run: the dry write first, then the real one ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
// A plan started from the ledger's accounts first reads the template it applies.
import { z } from "zod"
import type { ErrorBody } from "../src/lib/contract"
import { type Edit, writeCommand } from "../src/lib/edit/edit"
import { templateRead } from "../src/lib/edit/plan-command"
import {
	carriesFlatClaim,
	taxSwapRead,
	taxSwapRefusal,
	taxSwapShow,
} from "../src/lib/edit/tax-swap"
import { type RunContext, runTraj } from "./run-traj"

/** Whether the Edit starts a plan from the ledger's accounts, so the server reads the template first. */
function startsPlan(edit: Edit): edit is Extract<Edit, { template: unknown }> {
	return edit.kind === "apply-plan" && "template" in edit
}

/** The CLI's own answer to a dry run of an apply: `created` when no plan of the name was stored. */
const applyStatus = z.looseObject({ status: z.string() })

/** The anchors and Owners an apply dropped (cli ADR-0048, ADR-0076): `scenario apply` and `scenario fork` state them. */
const droppedStatement = z.looseObject({
	droppedAnchors: z.array(z.string()).optional(),
	droppedOwners: z.array(z.string()).optional(),
})

/** The household anchors and Owners a write dropped. */
type Dropped = {
	readonly droppedAnchors: readonly string[]
	readonly droppedOwners: readonly string[]
}

/** What one Edit's run came to: it ran (with what the write dropped and whether it replaced a plan of its name), or the error that stopped it. */
export type EditRun =
	| ({ readonly ok: true; readonly replaced: boolean } & Dropped)
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

/** The household anchors and Owners a write's answer says it dropped; none when it says nothing. */
function droppedOf(data: unknown): Dropped {
	const dropped = droppedStatement.safeParse(data)
	if (!dropped.success) return { droppedAnchors: [], droppedOwners: [] }
	return {
		droppedAnchors: dropped.data.droppedAnchors ?? [],
		droppedOwners: dropped.data.droppedOwners ?? [],
	}
}

/** Whether a write's answer says the plan was created, as a new plan's must. */
function wasCreated(data: unknown): boolean {
	const status = applyStatus.safeParse(data)
	return status.success && status.data.status === "created"
}

/**
 * Reads the plan again before a tax Edit that carries a flat claim, and refuses while its stored profile still records
 * those claims under someone else: `scenario household` leaves the content hash unchanged, so the page's hash cannot
 * tell that it read before the swap (issue #665, cli ADR-0055).
 */
async function swapRefusal(context: RunContext, edit: Edit): Promise<ErrorBody | null> {
	if (!carriesFlatClaim(edit)) return null
	const read = await runTraj(context, taxSwapRead(edit.name).argv, taxSwapShow)
	return read.ok ? taxSwapRefusal(read.data.scenario, edit.name) : read.error
}

/** Runs one Edit, dry and then real. It ran, or it is the CLI's error (or the refusal) as data. */
export async function runEdit(context: RunContext, edit: Edit): Promise<EditRun> {
	const stopped = (error: ErrorBody): EditRun => ({ ok: false, error })
	const swapped = await swapRefusal(context, edit)
	if (swapped !== null) return stopped(swapped)
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
	// A plan of the name made between the dry run and this write (a window of milliseconds) is replaced: the write is done, so it ran, and says so.
	return {
		ok: true,
		replaced: startsPlan(edit) && !wasCreated(real.data),
		...droppedOf(real.data),
	}
}
