import { expect, test } from "@playwright/test"
import { answerConsent, consentState, signUp } from "./people"
import { queryLocal, scratchDir } from "./scratch"

const scratch = scratchDir()
if (scratch === undefined) throw new Error("the e2e scratch database is missing")

test("a withdrawal closes every open opt-in, not only the newest one", async ({ page }) => {
	const user = await signUp(page)
	await answerConsent(page, true)
	// A defect left two more open opt-ins behind; the next withdrawal must close all three.
	queryLocal(
		scratch,
		`insert into "marketingConsent" ("id", "userId", "optedIn", "wordingVersion", "source", "language", "givenAt", "withdrawnAt") values ('open-a', '${user.id}', 1, '2026-11-27', 'account', 'en', '2026-11-20T00:00:00.000Z', null), ('open-b', '${user.id}', 1, '2026-11-27', 'account', 'th', '2026-11-21T00:00:00.000Z', null)`,
	)
	await page.goto("/account/")
	await page.getByRole("switch", { name: "Email updates" }).click()
	await expect(page.getByRole("switch", { name: "Email updates" })).not.toBeChecked()

	const open = queryLocal<{ id: string }>(
		scratch,
		`select "id" from "marketingConsent" where "userId" = '${user.id}' and "optedIn" = 1 and "withdrawnAt" is null`,
	)
	expect(open).toEqual([])
	expect((await consentState(page))?.optedIn).toBe(false)
})

test("the latest answer is read even after more than a hundred earlier ones", async ({ page }) => {
	const user = await signUp(page)
	await answerConsent(page, false)
	// The adapter's default page is 100 rows, so a read of the oldest page would stop at row 100 and
	// report an opt-in. The five newest answers opt out, so only a read of the true newest answers.
	const rows = Array.from({ length: 105 }, (_unused, index) => {
		const givenAt = new Date(Date.UTC(2027, 0, 1, 0, index)).toISOString()
		const optedIn = index < 100 ? 1 : 0
		return `('many-${index}', '${user.id}', ${optedIn}, 'w${index}', 'account', 'en', '${givenAt}', null)`
	})
	queryLocal(
		scratch,
		`insert into "marketingConsent" ("id", "userId", "optedIn", "wordingVersion", "source", "language", "givenAt", "withdrawnAt") values ${rows.join(", ")}`,
	)
	await page.goto("/account/")
	await expect(page.getByRole("switch", { name: "Email updates" })).not.toBeChecked()
	expect((await consentState(page))?.optedIn).toBe(false)
})
