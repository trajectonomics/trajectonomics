import { expect, test } from "@playwright/test"
import { answerConsent, consentState, signUp } from "./people"
import { queryLocal, scratchDir } from "./scratch"

const scratch = scratchDir()
if (scratch === undefined) throw new Error("the e2e scratch database is missing")

type ConsentRow = {
	optedIn: number
	source: string
	language: string
	withdrawnAt: string | null
	wordingVersion: string
}

test("turning email updates off appends a withdrawal and keeps the earlier answer", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page, false)
	await page.goto("/account/")
	const toggle = page.getByRole("switch", { name: "Email updates" })
	await expect(toggle).not.toBeChecked()
	await toggle.click()
	await expect(toggle).toBeChecked()
	await toggle.click()
	await expect(toggle).not.toBeChecked()

	const rows = queryLocal<ConsentRow>(
		scratch,
		`select "optedIn", "source", "language", "wordingVersion", "withdrawnAt" from "marketingConsent" where "userId" = '${user.id}' order by "givenAt" asc`,
	)
	expect(rows.map((row) => row.source)).toEqual(["first-sign-in", "account", "account"])
	expect(rows[0]?.language).toBe("en")
	expect(rows[1]?.optedIn).toBe(1)
	expect(rows[1]?.withdrawnAt).not.toBeNull()
	expect(rows[2]?.optedIn).toBe(0)
	// The toggle quotes the sentence the stored answer agreed to, not a paraphrase of it.
	await expect(
		page.getByText("Email me product updates (about once a month). You can stop any time."),
	).toBeVisible()
})

test("the Thai account page records the language the person answered in", async ({ page }) => {
	const user = await signUp(page)
	await answerConsent(page, false, "th")
	await page.goto("/th/account/")
	await page.getByRole("switch", { name: "ข่าวสารทางอีเมล" }).click()
	await expect(page.getByRole("switch", { name: "ข่าวสารทางอีเมล" })).toBeChecked()

	const rows = queryLocal<ConsentRow>(
		scratch,
		`select "optedIn", "source", "language", "wordingVersion", "withdrawnAt" from "marketingConsent" where "userId" = '${user.id}' order by "givenAt" asc`,
	)
	expect(rows.map((row) => row.language)).toEqual(["th", "th"])
	expect((await consentState(page))?.language).toBe("th")
})
