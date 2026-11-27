import { expect, test } from "@playwright/test"
import { answerConsent, signUp } from "./people"
import { queryLocal, queryLocalMany, scratchDir } from "./scratch"

const scratch = scratchDir()
if (scratch === undefined) throw new Error("the e2e scratch database is missing")

/** Every table that could still name a deleted person, with all of its rows as text. */
function tablesHoldingPeople(): Readonly<Record<string, readonly string[]>> {
	const names = queryLocal<{ name: string }>(
		scratch as string,
		"select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not in ('_cf_KV', 'd1_migrations', 'pendingDeletion')",
	).map((table) => table.name)
	const rows = queryLocalMany<Record<string, unknown>>(
		scratch as string,
		names.map((name) => `select * from "${name}"`).join("; "),
	)
	return Object.fromEntries(
		names.map((name, index) => [name, (rows[index] ?? []).map((row) => JSON.stringify(row))]),
	)
}

// Each of these reads the scratch D1 through a second wrangler process, which is slow on a loaded
// machine; the browser part is quick.
test.setTimeout(60_000)

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
		nextAttemptAt: string
	}>(
		scratch,
		`select "acknowledgedAt", "attempts", "lastError", "nextAttemptAt" from "pendingDeletion" where "authUserId" = '${user.id}'`,
	)
	expect(pending.length).toBe(1)
	// The data service is not running here, so the row waits for the hourly retry, as designed.
	expect(pending[0]?.acknowledgedAt).toBeNull()
	expect(pending[0]?.attempts).toBe(1)
	expect(pending[0]?.lastError).not.toBeNull()
	// The first retry waits the five-minute base, and the cron reads exactly this column.
	const nextAttempt = Date.parse(pending[0]?.nextAttemptAt ?? "")
	expect(nextAttempt - Date.now()).toBeGreaterThan(4 * 60_000)
	expect(nextAttempt - Date.now()).toBeLessThan(6 * 60_000)

	expect(
		queryLocal<{ id: string }>(scratch, `select "id" from "user" where "id" = '${user.id}'`),
	).toEqual([])
	// No table keeps the id of a person who no longer exists.
	const leftovers = Object.entries(tablesHoldingPeople())
		.filter(([, rows]) => rows.some((row) => row.includes(user.id)))
		.map(([table]) => table)
	expect(leftovers).toEqual([])
})

test("a failed queue insert aborts the deletion, so the account is still there", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page)
	// A trigger is the one way to make a real D1 insert fail from outside the Worker without taking
	// the rest of the schema down with it: only the queue's insert is refused.
	queryLocal(
		scratch,
		`create trigger "block_queue" before insert on "pendingDeletion" begin select raise(abort, 'queue blocked'); end`,
	)
	try {
		await page.goto("/account/")
		await page.getByLabel("Type your email to confirm").fill(user.email)
		await page.getByRole("button", { name: "Delete my account" }).click()
		await expect(page.getByRole("alert")).toContainText("The account was not deleted")
		expect(
			queryLocal<{ id: string }>(scratch, `select "id" from "user" where "id" = '${user.id}'`),
		).toHaveLength(1)
		await expect(page.getByRole("switch", { name: "Email updates" })).toBeVisible()
	} finally {
		queryLocal(scratch, 'drop trigger "block_queue"')
	}
})
