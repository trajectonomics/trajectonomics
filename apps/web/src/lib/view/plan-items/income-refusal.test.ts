import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../../contract"
import { fieldOfRefusal } from "./refusal"

const refusal = (path: string): ErrorBody => ({
	code: "invalid_input",
	exitCode: 2,
	message: "m",
	path,
})
const ACCOUNT = [
	"rate",
	"payoutRate",
	"payoutFrequency",
	"payoutRounding",
	"payoutStart",
	"payoutKind",
	"feeRate",
	"feeRounding",
]
const SALARY = [
	"amount",
	"start",
	"end",
	"earned",
	"employerAccount",
	"employerShare",
	"employerRounding",
]

describe("where a refusal of a payout, a fee or an employer's share lands", () => {
	test("a payout's and a fee's keys land at their own fields, not at the Account's rate", () => {
		const at = (path: string) => fieldOfRefusal(refusal(path), ACCOUNT)
		expect(at("document.accounts.fund.payout.bps")).toBe("payoutRate")
		expect(at("document.accounts.fund.payout.frequency")).toBe("payoutFrequency")
		expect(at("document.accounts.fund.payout.label")).toBe("payoutKind")
		expect(at("document.accounts.fund.payout.startAt")).toBe("payoutStart")
		expect(at("document.accounts.fund.payout")).toBe("payoutRate")
		expect(at("document.accounts.fund.fee.bps")).toBe("feeRate")
		expect(at("document.accounts.fund.fee.rounding")).toBe("feeRounding")
		expect(at("document.accounts.fund.rate")).toBe("rate")
	})

	test("a refusal on the employer's Flow lands in the employer section, and a date lands at the salary's own date", () => {
		const at = (path: string) => fieldOfRefusal(refusal(path), SALARY)
		expect(at("document.flows.salary-employer.label")).toBe("employerAccount")
		expect(at("document.flows.salary-employer.funding")).toBe("employerAccount")
		expect(at("document.flows.salary-employer.target")).toBe("employerAccount")
		expect(at("document.flows.salary-employer.derive.measures.1.rounding")).toBe("employerRounding")
		expect(at("document.flows.salary-employer.derive.measures.1.num")).toBe("employerShare")
		expect(at("document.flows.salary-employer.start")).toBe("start")
		expect(at("document.flows.salary.amount")).toBe("amount")
	})

	test("a refusal deeper under a payout is no field of it: the key straight after `payout` names the field", () => {
		const at = (path: string) => fieldOfRefusal(refusal(path), ACCOUNT)
		expect(at("document.accounts.fund.payout.prepayments.0.bps")).toBeNull()
		expect(at("document.accounts.fund.payout.prepayments.0.rounding")).toBeNull()
		expect(at("document.accounts.fund.payout.bps")).toBe("payoutRate")
		expect(at("document.accounts.fund.fee.bps")).toBe("feeRate")
	})
})
