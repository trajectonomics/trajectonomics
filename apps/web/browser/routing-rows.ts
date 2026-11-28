import { expect, type Locator, type Page } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"

/** The scratch plan that carries the routing rows check (#829): two withdrawals, and three surplus steps. */
export const PLAN = "row-order-360"

/** What an intercepted Edit is answered: a refusal, so the page shows one and writes nothing. */
const REFUSAL = {
	ok: false,
	error: { code: "invalid_scenario", exitCode: 1, message: "The check kept the saved order." },
}

/** One Edit the page sent: the document it would write. */
export type Edit = {
	document: { cashflow: { withdraw?: unknown[]; surplus?: { account: string }[] } }
}

/** The Snapshot's reads this check needs: the plan's document, and the Account names. */
type Snapshot = {
	reads: {
		accounts: { data: { accounts: { id: string; name: string }[] } }
		documents: Record<string, { data: { scenario: { document: Edit["document"] } } }>
	}
}

/** The plan's saved lists, and the Account names the drawer's picker shows. */
export type Saved = {
	cashflow: { withdraw: unknown[]; surplus: { account: string }[] }
	accounts: { id: string; name: string }[]
}

export async function saved(page: Page): Promise<Saved> {
	const body = (await (
		await page.request.get(`${SCRATCH_ORIGIN}/snapshot.json`)
	).json()) as Snapshot
	const document = body.reads.documents[PLAN]?.data.scenario.document
	if (document?.cashflow.withdraw === undefined || document.cashflow.surplus === undefined)
		throw new Error(`The Snapshot holds the ${PLAN} routing`)
	return {
		cashflow: {
			withdraw: document.cashflow.withdraw,
			surplus: document.cashflow.surplus,
		},
		accounts: body.reads.accounts.data.accounts,
	}
}

/** The name of the Account an entry or step names, which the drawer's picker shows. */
export function nameOf(accounts: Saved["accounts"], id: unknown): string {
	if (typeof id !== "string") throw new Error("A withdrawal entry here is an Account")
	return accounts.find((account) => account.id === id)?.name ?? id
}

/** Moves the section's first row down without saving, and returns that row, now first on screen. */
export async function moveFirstDown(section: Locator): Promise<Locator> {
	await section
		.getByRole("button", { name: /: move .* down$/ })
		.first()
		.click()
	await expect(section.getByText("The new order is not saved yet.")).toBeVisible()
	return section.getByRole("listitem").first()
}

/** Opens the row's drawer at the Account it names, says whether it tries, and closes it. */
export async function opensAccount(
	page: Page,
	row: Locator,
	button: RegExp,
	field: string,
	name: string,
	trying: boolean,
): Promise<void> {
	await row.getByRole("button", { name: button }).click()
	const drawer = page.getByRole("dialog")
	await expect(drawer.locator(`#${field} option:checked`)).toHaveText(name)
	if (trying) await expect(drawer.getByRole("button", { name: "Try this value" })).toBeVisible()
	await drawer.getByRole("button", { name: "Close the drawer" }).click()
}

/** Captures every Edit and answers a refusal, so the check reads the body it would send and writes nothing. */
export async function interceptEdits(page: Page): Promise<Edit[]> {
	const edits: Edit[] = []
	await page.route("**/edit", async (route) => {
		edits.push(route.request().postDataJSON() as Edit)
		await route.fulfill({ json: REFUSAL })
	})
	return edits
}
