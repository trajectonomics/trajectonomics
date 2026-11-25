// The plan-managing Edits against the real traj (web ADR 0023): a plan from the ledger, renamed, noted, made main, seen first
// on the plans page and on Home, and the old main plan deleted after another is chosen.
import { afterAll, afterEach, describe, expect, test } from "bun:test"
import type { Snapshot } from "../src/lib/contract"
import { homePlan } from "../src/lib/view/overview/scenario"
import { notProjected, planCards } from "../src/lib/view/plans/card"
import { mainEdit, newPlanEdit, notesEdit, renameEdit } from "../src/lib/view/plans/edits"
import { parseRange } from "../src/lib/view/plans/range"
import { planRows } from "../src/lib/view/plans/rows"
import {
	BINARY,
	disposeEditor,
	ledgerHome,
	postEdit,
	SLOW_MS,
	setupEditor,
} from "./edit-fixture.test-support"
import { editRequest, PARAMS, PORT } from "./edit-request.test-support"
import { settle } from "./editor-running.test-support"

/** What the page does: sends the Edit, and reads the Snapshot it answers with. */
async function run(
	edit: unknown,
): Promise<{ snapshot: Snapshot } | { code: string; message: string }> {
	const { answer } = await postEdit(JSON.stringify(edit))
	return answer.ok
		? { snapshot: answer.snapshot as unknown as Snapshot }
		: { code: answer.error.code, message: answer.error.message }
}

async function snapshotAfter(edit: unknown): Promise<Snapshot> {
	const result = await run(edit)
	if (!("snapshot" in result)) throw new Error(`${result.code}: ${result.message}`)
	return result.snapshot
}

function rowOf(snapshot: Snapshot, name: string) {
	const row = planRows(snapshot).find((one) => one.name === name)
	if (row === undefined) throw new Error(`the ledger holds no ${name}`)
	return row
}

/** A terminal command in the scratch ledger, as a person would run it. */
function terminal(...argv: string[]): void {
	const done = Bun.spawnSync([BINARY, ...argv, "--json"], {
		env: { ...process.env, TRAJ_HOME: ledgerHome(), DO_NOT_TRACK: "1" },
	})
	if (done.exitCode !== 0) throw new Error(done.stderr.toString() || done.stdout.toString())
}

afterEach(settle, SLOW_MS)
afterAll(disposeEditor)

describe("managing plans against the real traj", () => {
	test(
		"makes a plan from the ledger, renames it, adds notes, makes it main, and deletes the old main",
		async () => {
			await setupEditor()
			// A plan from "my accounts today": the template at the As-of, under the new name.
			let snapshot = await snapshotAfter(newPlanEdit("fresh", { from: "accounts" }, PARAMS.asOf))
			expect(snapshot.params.scenarios).toEqual(["base", "fresh"])
			expect(Object.keys(snapshot.reads.projections)).toContain("fresh")

			// Rename it: the Snapshot follows the new name, and the old one is gone.
			snapshot = await snapshotAfter(renameEdit(rowOf(snapshot, "fresh"), "later"))
			expect(snapshot.params.scenarios).toEqual(["base", "later"])
			expect(Object.keys(snapshot.reads.projections)).toEqual(["base", "later"])
			expect(rowOf(snapshot, "later").projected).toBe(true)

			// Notes: the list says there are some, the plan states them, and the first line shows on its card.
			snapshot = await snapshotAfter(notesEdit("later", "Starts from my accounts.\nNo salary yet."))
			expect(rowOf(snapshot, "later").hasNotes).toBe(true)
			const shown = snapshot.reads.documents["later"]
			expect(shown?.ok && shown.data.scenario.notes).toBe(
				"Starts from my accounts.\nNo salary yet.",
			)
			const card = planCards(snapshot, parseRange("all")).find((one) => one.row.name === "later")
			expect(card?.notes?.first).toBe("Starts from my accounts.")

			// Make base the main plan, then make the new plan main instead.
			snapshot = await snapshotAfter(mainEdit("base"))
			expect(planRows(snapshot)[0]?.name).toBe("base")
			// The old main plan cannot be deleted while it is main: traj refuses, and nothing changes.
			const refused = await run({ kind: "delete-plan", name: "base" })
			expect("code" in refused && refused.code).toBe("scenario_is_main")

			snapshot = await snapshotAfter(mainEdit("later"))
			expect(planRows(snapshot).map((row) => [row.name, row.main])).toEqual([
				["later", true],
				["base", false],
				["retire-early", false],
			])
			// It is first on the plans page, on Home, and in the order every page opens on.
			expect(planCards(snapshot, parseRange("all"))[0]?.row.name).toBe("later")
			expect(homePlan(snapshot, "")).toBe("later")
			expect(homePlan(snapshot, "base")).toBe("base")
			expect(snapshot.params.scenarios).toEqual(["later", "base"])

			// Now the old main plan can go.
			snapshot = await snapshotAfter({ kind: "delete-plan", name: "base" })
			expect(snapshot.params.scenarios).toEqual(["later"])
			expect(planRows(snapshot).map((row) => row.name)).toEqual(["later", "retire-early"])
		},
		SLOW_MS,
	)

	test(
		"a new plan under a taken name is refused and replaces nothing",
		async () => {
			const result = await run(newPlanEdit("later", { from: "accounts" }, PARAMS.asOf))
			expect("code" in result && result.code).toBe("scenario_name_taken")
			const kept = JSON.parse((await setupEditor()).body ?? "null") as Snapshot
			const notes = kept.reads.documents["later"]
			expect(notes?.ok && notes.data.scenario.notes).toBe(
				"Starts from my accounts.\nNo salary yet.",
			)
		},
		SLOW_MS,
	)

	test(
		"a rename over a plan that changed since the page read it is refused",
		async () => {
			const kept = JSON.parse((await setupEditor()).body ?? "null") as Snapshot
			const row = rowOf(kept, "later")
			terminal("scenario", "tax", "later", "--none")
			terminal("scenario", "fork", "later", "extra")
			const stale = await run({
				...renameEdit({ ...row, contentHash: `jcs1:sha256:${"0".repeat(64)}` }, "other"),
			})
			expect("code" in stale && stale.code).toBe("scenario_changed")
			const taken = await run(renameEdit(row, "extra"))
			expect("code" in taken && taken.code).toBe("scenario_name_taken")
		},
		SLOW_MS,
	)

	test(
		"a plan made in a terminal is listed as not projected, and is added with a reread",
		async () => {
			const editor = await setupEditor()
			// The page reads again after the terminal's change, as the Reload action does.
			await editor.reread(editRequest({}, "{}"), PORT)
			const before = JSON.parse(editor.body ?? "null") as Snapshot
			// The demo ledger holds `retire-early` too, which the editor was not started with.
			expect(notProjected(before).map((row) => row.name)).toEqual(["extra", "retire-early"])
			const response = await editor.reread(
				editRequest({}, JSON.stringify({ addPlan: "extra" })),
				PORT,
			)
			const answer = (await response.json()) as { ok: boolean; snapshot: Snapshot }
			expect(answer.ok).toBe(true)
			expect(answer.snapshot.params.scenarios).toEqual(["later", "extra"])
			expect(notProjected(answer.snapshot).map((row) => row.name)).toEqual(["retire-early"])
			// A name the ledger does not hold is not added.
			const ghost = await editor.reread(editRequest({}, JSON.stringify({ addPlan: "ghost" })), PORT)
			const kept = (await ghost.json()) as { snapshot: Snapshot }
			expect(kept.snapshot.params.scenarios).toEqual(["later", "extra"])
		},
		SLOW_MS,
	)
})
