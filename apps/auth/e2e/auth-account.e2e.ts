import { expect, test } from "@playwright/test"
import { answerConsent, signUp } from "./people"
import { queryLocal, scratchDir } from "./scratch"

const scratch = scratchDir()
if (scratch === undefined) throw new Error("the e2e scratch database is missing")

type ConsentRow = { optedIn: number; source: string; withdrawnAt: string | null }

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
		`select "optedIn", "source", "withdrawnAt" from "marketingConsent" where "userId" = '${user.id}' order by "givenAt" asc`,
	)
	expect(rows.map((row) => row.source)).toEqual(["first-sign-in", "account", "account"])
	expect(rows[1]?.optedIn).toBe(1)
	expect(rows[1]?.withdrawnAt).not.toBeNull()
	expect(rows[2]?.optedIn).toBe(0)
})

test("deleting the account removes it and queues the data side notice", async ({ page }) => {
	const user = await signUp(page)
	await answerConsent(page)
	await page.goto("/account/")
	await page.getByLabel("Type your email to confirm").fill(user.email)
	await page.getByRole("button", { name: "Delete my account" }).click()
	await page.waitForURL(/\/sign-in\/\?deleted=1/)
	await expect(page.getByText("Your account was deleted.")).toBeVisible()

	const pending = queryLocal<{
		acknowledgedAt: string | null
		attempts: number
		lastError: string | null
	}>(
		scratch,
		`select "acknowledgedAt", "attempts", "lastError" from "pendingDeletion" where "authUserId" = '${user.id}'`,
	)
	expect(pending.length).toBe(1)
	// The data service is not running here, so the row waits for the hourly retry, as designed.
	expect(pending[0]?.acknowledgedAt).toBeNull()
	expect(pending[0]?.attempts).toBe(1)
	expect(pending[0]?.lastError).not.toBeNull()
	expect(
		queryLocal<{ id: string }>(scratch, `select "id" from "user" where "id" = '${user.id}'`),
	).toEqual([])
	expect(
		queryLocal<{ id: string }>(
			scratch,
			`select "id" from "marketingConsent" where "userId" = '${user.id}'`,
		),
	).toEqual([])
})
