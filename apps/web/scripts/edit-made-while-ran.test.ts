// A plan of the name a new plan's Edit writes is made while it runs (issue #750, item 2): the write is done, so it
// ran, and the answer says it replaced that plan ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { join } from "node:path"
import { scenarioList } from "../src/lib/contract"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"

/**
 * A `traj` around the workspace binary that forks `raced` just before the real `scenario apply raced` writes: the
 * name is taken by the time the write runs, so the write replaces that plan. The dry run and every other call go
 * straight through.
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

/** The plans the ledger stores, read through the workspace binary itself. */
function ledgerNames(): string[] {
	const run = Bun.spawnSync([BINARY, "scenario", "list", "--json"], {
		env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" },
	})
	return scenarioList.parse(JSON.parse(run.stdout.toString())).scenarios.map((plan) => plan.name)
}

beforeAll(async () => {
	scratch = await makeScratch("traj-web-raced-")
	home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
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

describe("a new plan that replaced one made while the Edit ran", () => {
	test(
		"answers ok with replaced, and the plan it replaced is the one the page is served and the ledger holds",
		async () => {
			const editing = editor
			if (editing === null) throw new Error("no editor")
			const answer = await editing.edit(editRequest({}, NEW_PLAN), 4321)
			expect(answer.status).toBe(200)
			const body = (await answer.json()) as {
				ok: boolean
				replaced?: boolean
				snapshot: { params: { scenarios: string[] } }
			}
			expect(body.ok).toBe(true)
			expect(body.replaced).toBe(true)
			// `params` followed the write, so Reload reads the plan the write made.
			expect(body.snapshot.params.scenarios).toContain("raced")
			expect(editing.body).toContain("raced")
			expect(ledgerNames()).toContain("raced")
		},
		SLOW_MS,
	)
})
