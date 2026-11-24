import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../../contract"
import { assumptionFieldOfRefusal, assumptionsShown } from "./refusal"

describe("a refusal lands on the row its path names", () => {
	const ids = ["bank", "fund", "home", "loan"]
	const refusal = (path: string): ErrorBody => ({
		code: "invalid_input",
		exitCode: 2,
		message: "Volatility is 0 to 100 percent.",
		path,
	})

	test("by the Account's id or by its position, and inflation by its block", () => {
		expect(assumptionFieldOfRefusal(refusal("document.accounts.fund.volatility"), ids)).toBe(
			"volatility:fund",
		)
		expect(assumptionFieldOfRefusal(refusal("accounts.0.rate"), ids)).toBe("rate:bank")
		expect(assumptionFieldOfRefusal(refusal("document.economy.inflation"), ids)).toBe("inflation")
		expect(assumptionFieldOfRefusal(refusal("document.accounts.fund.fee.bps"), ids)).toBe(
			"feeRate:fund",
		)
		expect(assumptionFieldOfRefusal(refusal("accounts.1.fee.rounding"), ids)).toBe(
			"feeRounding:fund",
		)
		expect(assumptionFieldOfRefusal(refusal("document.accounts.9.rate"), ids)).toBeNull()
		expect(assumptionFieldOfRefusal(refusal("document.accounts.fund.compounding"), ids)).toBeNull()
	})

	test("shows the CLI's words at that row and nowhere else; a path that names no row is for the whole form", () => {
		const shown = assumptionsShown(
			{},
			refusal("document.accounts.fund.volatility"),
			"Volatility is 0 to 100 percent.",
			ids,
		)
		expect(shown.at("volatility:fund")).toBe("Volatility is 0 to 100 percent.")
		expect(shown.at("volatility:bank")).toBeUndefined()
		expect(shown.general).toBeUndefined()
		const whole = assumptionsShown({}, refusal("--if-hash"), "Nope.", ids)
		expect(whole.general).toBe("Nope.")
	})
})
