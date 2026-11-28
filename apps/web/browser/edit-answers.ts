// The checks that read how a form answers a save without writing (web #851): every `POST /edit` is answered here, so the
// shared scratch server never gets one.
import { expect, type Locator, type Page } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"

/** An Edit as the page sends it, as far as these checks read it. */
export interface SentEdit {
	kind: string
	householdHash?: string
	document?: { flows: { id: string }[] }
	household?: { anchors: { path: string }[]; owners?: { path: string; person: string }[] }
}

/** Answers each Edit with `answer`, and keeps what the page sent. */
export async function answerEdits(
	page: Page,
	answer: (sent: SentEdit, at: number) => unknown,
): Promise<SentEdit[]> {
	const sent: SentEdit[] = []
	await page.route("**/edit", (route) => {
		const edit = route.request().postDataJSON() as SentEdit
		sent.push(edit)
		return route.fulfill({
			contentType: "application/json",
			body: JSON.stringify(answer(edit, sent.length - 1)),
		})
	})
	return sent
}

/** The CLI's envelope of a refusal at a path. */
export const refused = (message: string, path?: string, code = "invalid_input") => ({
	ok: false,
	error: { code, exitCode: 2, message, ...(path === undefined ? {} : { path }) },
})

/** Opens a page of the scratch Dashboard on one plan. */
export async function openScratch(
	page: Page,
	path: string,
	plan: string,
	hideAmounts = false,
): Promise<void> {
	await chooseBeforeLoad(page, { theme: "light", hideAmounts })
	await page.goto(`${SCRATCH_ORIGIN}${path}?scenario=${plan}`)
	await settle(page, "light")
}

/** Opens the Add income drawer and fills what a monthly income needs. */
export async function fillIncome(page: Page, id: string): Promise<Locator> {
	await page.getByRole("button", { name: "Add income", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await expect(dialog).toBeVisible()
	await dialog.getByLabel("Id", { exact: true }).fill(id)
	await dialog.getByLabel("Starts", { exact: true }).fill("2026-11-01")
	await dialog.getByLabel("Amount per occurrence", { exact: true }).fill("1000")
	return dialog
}

/** The Snapshot the scratch Dashboard serves now, for an answer to hand back. */
export async function scratchSnapshot(page: Page) {
	return (await page.request.get(`${SCRATCH_ORIGIN}/snapshot.json`)).json()
}

/** Answers each Reload with the Snapshot the page has read, so the shared server reads nothing again. */
export async function answerRereads(page: Page): Promise<void> {
	const snapshot = await scratchSnapshot(page)
	await page.route("**/reread", (route) =>
		route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({ ok: true, snapshot }),
		}),
	)
}
