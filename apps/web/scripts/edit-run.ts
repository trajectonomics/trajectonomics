// What one Edit's run came to, and the helpers that read a plan write's answer: shared by the single-write
// Edits (serve-apply.ts) and the guided plan's two writes (serve-guided.ts) ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { z } from "zod"
import type { ErrorBody } from "../src/lib/contract"

/** The household anchors and Owners a write dropped (cli ADR-0048, ADR-0076). */
export type Dropped = {
	readonly droppedAnchors: readonly string[]
	readonly droppedOwners: readonly string[]
}

/** What one Edit's run came to: it ran (with whether it replaced a plan of its name), or the error that stopped it. */
export type EditRun =
	| ({ readonly ok: true; readonly replaced: boolean } & Dropped)
	| { readonly ok: false; readonly error: ErrorBody }

/** The CLI's own answer to a dry run of an apply: `created` when no plan of the name was stored. */
const applyStatus = z.looseObject({ status: z.string() })

/** The anchors and Owners an apply dropped (cli ADR-0048, ADR-0076): `scenario apply` and `scenario fork` state them. */
const droppedStatement = z.looseObject({
	droppedAnchors: z.array(z.string()).optional(),
	droppedOwners: z.array(z.string()).optional(),
})

/** The exit code `traj` gives a taken name (cli ADR-0021: a conflict with what the ledger holds). */
const NAME_TAKEN_EXIT_CODE = 5

/** The refusal of a new plan whose name is taken: the page checks the names, and this holds when a terminal took it since. */
export function nameTaken(name: string): ErrorBody {
	return {
		code: "scenario_name_taken",
		exitCode: NAME_TAKEN_EXIT_CODE,
		message: `A plan named ${name} already exists.`,
	}
}

/** The household anchors and Owners a write's answer says it dropped; none when it says nothing. */
export function droppedOf(data: unknown): Dropped {
	const dropped = droppedStatement.safeParse(data)
	if (!dropped.success) return { droppedAnchors: [], droppedOwners: [] }
	return {
		droppedAnchors: dropped.data.droppedAnchors ?? [],
		droppedOwners: dropped.data.droppedOwners ?? [],
	}
}

/** Whether a write's answer says the plan was created, as a new plan's must. */
export function wasCreated(data: unknown): boolean {
	const status = applyStatus.safeParse(data)
	return status.success && status.data.status === "created"
}
