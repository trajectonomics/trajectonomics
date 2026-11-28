import { expect, test } from "@playwright/test"
import { DELETION_BATCH_LIMIT } from "../src/core/deletion"
import { DUE_PENDING_DELETIONS_SQL } from "../src/pending-deletion-retry"
import { answerConsent, signUp } from "./people"
import { queryLocal, scratchDir } from "./scratch"

const scratch = scratchDir()
if (scratch === undefined) throw new Error("the e2e scratch database is missing")

// Each of these reads the scratch D1 through a second wrangler process, which is slow on a loaded
// machine; the browser part is quick.
test.setTimeout(60_000)

/** The real due query with its two placeholders written as SQLite literals. */
function dueQuery(now: string, limit: number): string {
	return DUE_PENDING_DELETIONS_SQL.replace("?", `'${now}'`).replace("?", String(limit))
}

test("a failed deletion leaves a notice the retry skips while the user exists", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page)
	// A BEFORE DELETE trigger on the user is the one way to make the real deletion fail from
	// outside the Worker: the notice is queued, the user row stays, and the retry must not report
	// the live account to the data site.
	queryLocal(
		scratch,
		`create trigger "block_delete" before delete on "user" begin select raise(abort, 'delete blocked'); end`,
	)
	try {
		await page.goto("/account/")
		await page.getByLabel("Type your email to confirm").fill(user.email)
		await page.getByRole("button", { name: "Delete my account" }).click()
		// A 5xx may mean the deletion happened before the answer failed, so the page claims nothing.
		await expect(page.getByRole("alert")).toHaveText(
			"We couldn't confirm whether the account was deleted. Reload this page to check.",
		)
		// The page no longer acts as if the person is signed in.
		await expect(page.getByRole("switch", { name: "Email updates" })).toHaveCount(0)
		await expect(page.getByRole("button", { name: "Reload" })).toBeVisible()
		await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0)
		expect(
			queryLocal<{ id: string }>(scratch, `select "id" from "user" where "id" = '${user.id}'`),
		).toHaveLength(1)
		expect(
			queryLocal<{ id: string }>(
				scratch,
				`select "id" from "pendingDeletion" where "authUserId" = '${user.id}'`,
			),
		).toHaveLength(1)
		expect(
			queryLocal<{ id: string }>(scratch, dueQuery(new Date().toISOString(), DELETION_BATCH_LIMIT)),
		).toEqual([])
	} finally {
		queryLocal(scratch, 'drop trigger "block_delete"')
	}
})

test("a failed queue insert aborts the deletion, and the page stops acting signed in", async ({
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
		await expect(page.getByRole("alert")).toContainText("We couldn't confirm")
		expect(
			queryLocal<{ id: string }>(scratch, `select "id" from "user" where "id" = '${user.id}'`),
		).toHaveLength(1)
		await expect(page.getByRole("switch", { name: "Email updates" })).toHaveCount(0)
	} finally {
		queryLocal(scratch, 'drop trigger "block_queue"')
	}
})
