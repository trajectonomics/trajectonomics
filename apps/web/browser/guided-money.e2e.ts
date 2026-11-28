import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { formatMoney } from "../src/lib/format/money"
import { BASE_URL } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { fillHolder } from "./guided-plan"

// The guided money step tells the person why it stays (web ADR 0031): every row dropped says so, and Hide amounts
// shows the CLI's figure when a masked amount is focused.
/** The Demo's first income row, as the read states it, so a check compares the field with the CLI's own amount. */
function firstIncomeRow(): { name: string; amount: string } {
	const demo = JSON.parse(
		readFileSync(new URL("../public/demo/snapshot.json", import.meta.url), "utf8"),
	) as {
		reads: {
			rates?: {
				data?: {
					rows: {
						inTemplate: boolean
						type: string
						amount: string
						account: { name: string }
					}[]
				}
			}
		}
	}
	const row = demo.reads.rates?.data?.rows.find((one) => one.inTemplate && one.type === "income")
	if (row === undefined) throw new Error("the Demo states no income row for the money step")
	return { name: row.account.name, amount: row.amount }
}

test("Next says to keep a row when every row is unticked, and focuses that sentence", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${BASE_URL}/plans/new/?demo=1`)
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeFocused()
	const keeps = page.getByRole("checkbox", { name: /^Keep / })
	const count = await keeps.count()
	expect(count, "the money step's rows").toBeGreaterThan(0)
	for (let index = 0; index < count; index += 1) await keeps.nth(index).uncheck()
	await page.getByRole("button", { name: "Next" }).click()
	const alert = page.getByRole("alert")
	await expect(alert).toHaveText("Keep at least one row.")
	await expect(alert).toBeFocused()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible()
})

test("problems shown keep focus on the checkbox when the last kept row is unticked", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${BASE_URL}/plans/new/?demo=1`)
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	// An amount problem puts the problems on the step without dropping a row.
	const row = firstIncomeRow()
	await page.getByLabel(row.name, { exact: true }).fill("not a number")
	await page.getByRole("button", { name: "Next" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible()
	const keeps = page.getByRole("checkbox", { name: /^Keep / })
	const count = await keeps.count()
	for (let index = 0; index < count; index += 1) {
		await keeps.nth(index).focus()
		await page.keyboard.press("Space")
	}
	// The keep sentence appears with the last untick, but it took no focus: only Next moves focus to it.
	await expect(page.getByRole("alert")).toHaveText("Keep at least one row.")
	await expect(keeps.nth(count - 1)).toBeFocused()
})

test("a masked amount shows the CLI's figure on focus and the mask again on blur", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await chooseBeforeLoad(page, { theme: "light", hideAmounts: true })
	await page.goto(`${BASE_URL}/plans/new/?demo=1`)
	await settle(page, "light")
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible()
	const row = firstIncomeRow()
	const amount = page.getByLabel(row.name, { exact: true })
	await expect(amount).toHaveAttribute("placeholder", "•••••")
	await amount.focus()
	await expect(amount).toHaveAttribute("placeholder", formatMoney(row.amount))
	await amount.blur()
	await expect(amount).toHaveAttribute("placeholder", "•••••")
})
