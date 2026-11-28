// A couple's new income takes its Owner in the Income form (web #766): the Flow is saved first, then the household with the
// Owner under the hash that save answered with. A refused household keeps the drawer, and the next Save adds no second Flow.
import { expect, test } from "@playwright/test"
import {
	answerEdits,
	fillIncome,
	openScratch,
	refused,
	type SentEdit,
	scratchSnapshot,
} from "./edit-answers"
import { SLOW } from "./shared-interest"

const PLAN = "shared-360"
const hash = (pair: string) => `jcs1:sha256:${pair.repeat(32)}`

test("the Income form saves a Flow, then its Owner, and a second Save adds no other Flow", async ({
	page,
}) => {
	await openScratch(page, "/income/", PLAN)
	const snapshot = await scratchSnapshot(page)
	const read = snapshot.reads.documents[PLAN].data.scenario
	/** The Snapshot a write answers with: what it sent, under a household hash of its own. */
	const written = (sent: SentEdit, pair: string) => {
		read.document = sent.document ?? read.document
		read.household = sent.household ?? read.household
		read.householdHash = hash(pair)
		return { ok: true, snapshot }
	}
	const sent = await answerEdits(page, (edit, at) =>
		at === 1 ? refused("the CLI's owner words") : written(edit, at === 0 ? "cd" : "ef"),
	)
	const dialog = await fillIncome(page, "wired2")
	await dialog.getByLabel("Owner", { exact: true }).selectOption("partner")
	const save = dialog.getByRole("button", { name: "Save", exact: true })
	await save.click()

	await expect(dialog.getByRole("alert")).toHaveText("the CLI's owner words", { timeout: SLOW })
	expect(sent.map((edit) => edit.kind)).toEqual(["apply-plan", "set-household"])
	expect(sent[1]?.householdHash).toBe(hash("cd"))
	const owner = { path: "flows.wired2", person: "partner" }
	expect(sent[1]?.household?.owners).toContainEqual(owner)
	await expect(dialog.getByLabel("Owner", { exact: true })).toHaveValue("partner")

	await save.click()
	await expect(dialog).toBeHidden({ timeout: SLOW })
	const kinds = ["apply-plan", "set-household", "apply-plan", "set-household"]
	expect(sent.map((edit) => edit.kind)).toEqual(kinds)
	const added = sent[2]?.document?.flows.filter((flow) => flow.id.startsWith("wired2"))
	expect(added?.map((flow) => flow.id)).toEqual(["wired2"])
	expect(sent[3]?.householdHash).toBe(hash("ef"))
})
