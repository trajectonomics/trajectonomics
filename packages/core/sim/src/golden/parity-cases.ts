import type { Fixture } from "../fixtures/fixture"
import { freelancer } from "../fixtures/freelancer"
import { thaiEmployee } from "../fixtures/thai-employee"
import type { ChanceOfSuccessOptions, ProjectionOptions, SurvivalOptions } from "../types"
import { calendarFiMonth, calendarShiftDay } from "./calendar-cases"
import { freelancerChance } from "./chance-cases"
import { capped } from "./contribution-cases"
import { deriveRent } from "./derive-case"
import { levyJointFilers, wageBaseCase } from "./levy-cap-cases"
import {
	levyCarryInDay,
	levyRefundDay,
	levySalaryDay,
	levySettledMonth,
	levyShortfallDay,
	levyUnsettledMonth,
} from "./levy-cases"
import { levySeveral, levyStepped } from "./levy-extensions-cases"
import { levyGainsDay } from "./levy-gains-case"
import { levyReturnsDay } from "./levy-returns-case"
import { levyCareCredit } from "./levy-us-cases"
import { borrowDay, levelLoanMonth } from "./loan-cases"
import { milestoneFreelancer } from "./milestone-cases"
import { nominalLeapFebruary, nominalPartial, nominalReal, nominalZero } from "./nominal-cases"
import { nominalMonthlyLoan } from "./nominal-flow-cases"
import { configured, leapTie } from "./parity-fixtures"
import type { ParitySavings } from "./parity-savings"

export interface ParityCase {
	readonly name: string
	readonly fixture: Fixture
	readonly options?: SurvivalOptions
	readonly chance?: ChanceOfSuccessOptions
	/** A chance run over the Return model `planReturnModel` builds from the Scenario (ADR 0029). */
	readonly plan?: { readonly buckets: number; readonly seed: string; readonly paths: number }
	readonly projectOptions?: ProjectionOptions
	readonly savings?: ParitySavings
}

/** Inputs whose Projection and Financial Independence must hash identically under every engine. */
export const PARITY_CASES: readonly ParityCase[] = [
	{ name: "freelancer-day", fixture: freelancer },
	{
		name: "thai-employee-month",
		fixture: { ...thaiEmployee, timeline: { ...thaiEmployee.timeline, resolution: "month" } },
	},
	{ name: "leap-tie-day", fixture: leapTie },
	{ name: "capped-month", fixture: capped },
	{ name: "levy-salary-day", fixture: levySalaryDay },
	{ name: "levy-settled-month", fixture: levySettledMonth },
	{ name: "levy-refund-day", fixture: levyRefundDay },
	{ name: "levy-shortfall-day", fixture: levyShortfallDay },
	{ name: "levy-unsettled-month", fixture: levyUnsettledMonth },
	{ name: "levy-carry-in-day", fixture: levyCarryInDay },
	{ name: "levy-returns-day", fixture: levyReturnsDay },
	{ name: "levy-gains-day", fixture: levyGainsDay },
	{ name: "levy-care-credit", fixture: levyCareCredit },
	{ name: "levy-several", fixture: levySeveral },
	{ name: "levy-stepped", fixture: levyStepped },
	{ name: "derive-rent", fixture: deriveRent },
	{
		name: "derive-rent-fi",
		fixture: deriveRent,
		options: { method: "survival", minBufferMonths: 3 },
	},
	{ name: "levy-several-fi", fixture: levySeveral, options: { method: "survival" } },
	{ name: "loan-level-month", fixture: levelLoanMonth },
	{ name: "loan-borrow-day", fixture: borrowDay },
	{ name: "levy-wage-base", fixture: wageBaseCase(60_000_000) },
	{ name: "levy-joint-filers", fixture: levyJointFilers },
	{ name: "calendar-shift-day", fixture: calendarShiftDay },
	{ name: "calendar-fi", fixture: calendarFiMonth, options: { method: "survival" } },
	{ name: "freelancer-fi", fixture: freelancer, options: { method: "survival" } },
	{ name: "freelancer-chance", fixture: freelancer, chance: freelancerChance },
	{ name: "freelancer-fi-reference", fixture: freelancer, options: configured },
	{
		name: "thai-employee-fi-buffer",
		fixture: thaiEmployee,
		options: { method: "survival", minBufferMonths: 6 },
	},
	{ name: "nominal-monthly-loan", fixture: nominalMonthlyLoan },
	{ name: "nominal-partial-day", fixture: nominalPartial },
	{ name: "nominal-zero-month", fixture: nominalZero },
	{ name: "nominal-leap-february-day", fixture: nominalLeapFebruary },
	{ name: "nominal-real-month", fixture: nominalReal },
	{
		name: "freelancer-fi-retirement",
		fixture: freelancer,
		options: {
			method: "survival",
			retirementSpending: { amount: 2_000_000, growth: "inflation" },
			minBufferMonths: 3,
		},
	},
	{ name: "milestone-freelancer-month", fixture: milestoneFreelancer },
	{
		name: "milestone-freelancer-fi",
		fixture: milestoneFreelancer,
		options: { method: "survival" },
	},
	{ name: "milestone-freelancer-chance", fixture: milestoneFreelancer, chance: freelancerChance },
]
