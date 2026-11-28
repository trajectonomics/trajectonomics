// A refused save in a form's drawer (web #766): the sentence lands at the field of the form that made it, and focus lands
// with it, after Save and after Reload.
import { expect, test } from "@playwright/test"
import { answerEdits, answerRereads, fillIncome, openScratch, refused } from "./edit-answers"
import { SLOW } from "./shared-interest"

const PLAN = "shared-360"

test("a bad date at the employer's Flow shows at Starts", async ({ page }) => {
	await openScratch(page, "/income/", PLAN)
	await answerEdits(page, (sent) => {
		const at = sent.document?.flows.findIndex((flow) => flow.id === "paid-employer")
		return refused("the CLI's date words", `document.flows.${at}.start`)
	})
	const dialog = await fillIncome(page, "paid")
	await dialog.getByLabel("Earned income", { exact: false }).check()
	await dialog.getByLabel("Account", { exact: true }).selectOption({ index: 1 })
	await dialog.getByLabel("Share of this salary", { exact: true }).fill("5")
	await dialog.getByLabel("Each amount rounds", { exact: true }).selectOption({ index: 1 })
	await dialog.getByRole("button", { name: "Save", exact: true }).click()

	const starts = dialog.getByLabel("Starts", { exact: true })
	await expect(starts).toHaveAccessibleDescription(/the CLI's date words/, { timeout: SLOW })
})

test("a mouse Save refused at a field lands focus on that field", async ({ page }) => {
	await openScratch(page, "/income/", PLAN)
	await answerEdits(page, (sent) => {
		const at = sent.document?.flows.findIndex((flow) => flow.id === "paid")
		return refused("the CLI's date words", `document.flows.${at}.start`)
	})
	const dialog = await fillIncome(page, "paid")
	await dialog.getByRole("button", { name: "Save", exact: true }).click()

	const starts = dialog.getByLabel("Starts", { exact: true })
	await expect(starts).toHaveAccessibleDescription(/the CLI's date words/, { timeout: SLOW })
	await expect(starts).toBeFocused()
})

test("a refusal with no field focuses its sentence, and Reload focuses the first field", async ({
	page,
}) => {
	await openScratch(page, "/income/", PLAN)
	await answerRereads(page)
	await answerEdits(page, (_sent, at) =>
		at === 0 ? refused("the CLI's words") : refused("moved on", undefined, "scenario_changed"),
	)
	const dialog = await fillIncome(page, "paid")
	const save = dialog.getByRole("button", { name: "Save", exact: true })
	await save.click()
	await expect(dialog.getByRole("alert")).toHaveText("the CLI's words", { timeout: SLOW })
	await expect(dialog.getByRole("alert")).toBeFocused()

	await save.click()
	const reload = dialog.getByRole("button", { name: "Reload", exact: true })
	await reload.click()
	await expect(reload).toHaveCount(0, { timeout: SLOW })
	await expect(dialog.getByLabel("Id", { exact: true })).toBeFocused({ timeout: SLOW })
})

test("an end refused at the start's anchor shows at the Age of the anchor being added", async ({
	page,
}) => {
	await openScratch(page, "/household/", PLAN)
	// The plan pins the fund's end already, so pinning its start makes `traj` name the end's anchor.
	await answerEdits(page, (sent) => {
		const at = sent.household?.anchors.findIndex((anchor) => anchor.path === "flows.fund.end")
		return refused("the end is before the start", `document.anchors.${at}.path`, "END_BEFORE_START")
	})
	await page.getByRole("button", { name: "Pin a date", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await dialog.getByLabel("Item", { exact: true }).selectOption("fund")
	await dialog.getByLabel("Date", { exact: true }).selectOption("start")
	await dialog.getByLabel("Pinned to", { exact: true }).selectOption("me")
	await dialog.getByLabel("When", { exact: true }).selectOption("age")
	await dialog.getByLabel("Age", { exact: true }).fill("70")
	await dialog.getByRole("button", { name: "Pin the date", exact: true }).click()

	const age = dialog.getByLabel("Age", { exact: true })
	await expect(age).toHaveAccessibleDescription(/the end is before the start/, { timeout: SLOW })
	await expect(age).toBeFocused()
})
