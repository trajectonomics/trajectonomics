import type { LoanDraft } from "../src/lib/view/plan-items/loan-draft"

/** The draft of a boat loan a person types: 300000.00 borrowed on a future date, repaid in 24 monthly payments. */
export const BOAT: LoanDraft = {
	name: "Boat loan",
	principal: "300000.00",
	rate: "6.25",
	compounding: "monthly",
	payments: "24",
	firstPayment: "2027-07-01",
	rounding: "halfUp",
	arrival: "date",
	arrivalDate: "2027-06-01",
	owedAccount: "",
}
