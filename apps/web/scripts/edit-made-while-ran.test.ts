// A plan of the name a new plan's Edit writes is made while it runs (issue #750, item 2): the write creates a plan or
// refuses, so that plan stays as it was ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { join } from "node:path"
import { scenarioShow } from "../src/lib/contract"
import { demoCarryIn } from "./demo/carry-in"
import { copyDemoLedger } from "./demo-ledger.test-support"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"

/**
 * A `traj` around the workspace binary that forks `raced` just before the real `scenario apply raced` writes: the
 * name is taken by the time the write runs. The dry run and every other call go straight through.
 */
const MADE_WHILE_RAN = `
if [ "$1" = "scenario" ] && [ "$2" = "apply" ] && [ "$3" = "raced" ]; then
	case " $* " in
		*" --dry-run "*) ;;
		*) "$TRAJ_REAL" scenario fork base raced --json >/dev/null ;;
	esac
fi
exec "$TRAJ_REAL" "$@"
`

/** The Edit that starts a plan from the ledger's accounts, as the page sends it. */
const NEW_PLAN = JSON.stringify({
	kind: "apply-plan",
	name: "raced",
	template: { asOf: PARAMS.asOf },
})

let scratch = ""
let home = ""
let editor: Editor | null = null

/** One stored plan's content hash, read through the workspace binary itself. */
function storedHash(name: string): string {
	const run = Bun.spawnSync([BINARY, "scenario", "show", name, "--decimal", "--json"], {
		env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" },
	})
	return scenarioShow.parse(JSON.parse(run.stdout.toString())).scenario.contentHash
}

beforeAll(async () => {
	scratch = await makeScratch("traj-web-raced-")
	home = join(scratch, "traj-home")
	await copyDemoLedger({ binary: BINARY, home, scratch })
	const made = createEditor({
		traj: {
			binary: "/bin/sh",
			prefix: ["-c", MADE_WHILE_RAN, "traj"],
			env: { ...process.env, DO_NOT_TRACK: "1", TRAJ_HOME: home, TRAJ_REAL: BINARY },
		},
		cliVersion: "test",
		params: { ...PARAMS, scenarios: ["base"], carryIn: true },
		records: demoCarryIn(["base"]),
		token: TOKEN,
	})
	const first = await made.refresh()
	if (!first.ok) throw new Error(first.error.message)
	editor = made
}, SLOW_MS)

afterAll(async () => {
	if (scratch !== "") await removeScratch(scratch)
})

describe("a new plan whose name is taken while the Edit runs", () => {
	test(
		"is refused as the CLI refuses it, and the plan made meanwhile stays as it was",
		async () => {
			const editing = editor
			if (editing === null) throw new Error("no editor")
			const answer = await editing.edit(editRequest({}, NEW_PLAN), 4321)
			const body = (await answer.json()) as {
				ok: boolean
				error?: { code: string; path?: string }
			}
			expect(body.ok).toBe(false)
			expect(body.error).toMatchObject({ code: "scenario_name_taken", path: "name" })
			// `raced` is the fork of `base` the wrapper made: the template did not replace it.
			expect(storedHash("raced")).toBe(storedHash("base"))
		},
		SLOW_MS,
	)
})
