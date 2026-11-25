import {
	contributionSavings,
	type Levy,
	type LevyReport,
	type SettlementPeriod,
} from "@trajectonomics/core/sim"
import { thLevyAssumptions } from "@trajectonomics/core/tax/th"
import type { AppError } from "../errors"
import { assumptionViews } from "../tax-assumptions"
import { flowOf, targetOf } from "./allowances-flow"
import { type AllowanceRequest, MAX_STEPS } from "./allowances-input"
import { allowancesRefusal } from "./allowances-refusal"
import type { AllowanceRowView, AllowanceYearView } from "./allowances-rows-view"
import type { Placed } from "./carryin-apply"
import { moneyOf } from "./money"
import { withdrawAccount } from "./withdraw-account"

/** What one tax year's scan gave, in the CLI's money. */
export type YearRows = { year: AllowanceYearView; rows: AllowanceRowView[] }

/** One tax year to scan: the Levy and its period, and the labels the Levy reads. */
export type YearInput = {
	placed: Placed
	levy: Levy
	report: LevyReport
	period: SettlementPeriod
	request: AllowanceRequest
	labels: readonly string[]
	/** The Flow ids in use: the plan's, and those of the suggestions already made. */
	taken: Set<string>
}

/** Why a suggestion has no target Account, and what the caller does about it (cli ADR-0061). */
function noTargetHint(label: string, withdrawn: readonly string[]): string {
	if (withdrawn.length > 0) {
		return `The contribution of this plan that carries ${label} pays into ${withdrawn.join(", ")}, which the plan draws from (cashflow.withdraw), and the engine refuses a lump sum into it. Take the Account out of cashflow.withdraw, or add another asset Account for the purchase, then add this Flow with that Account as its target.`
	}
	return `No contribution of this plan carries ${label}. Pick the asset Account that will hold it, adding one to the Scenario if none fits, then add this Flow with that Account as its target.`
}

/** The engine's options for one year: the caller's, plus the Scenario's inflation and the step bound. */
function optionsOf(input: YearInput) {
	const { request, placed } = input
	return {
		labels: input.labels,
		step: request.step,
		grain: request.grain,
		inflation: placed.document.economy.inflation,
		maxSteps: MAX_STEPS,
		...(request.budget === undefined ? {} : { budget: request.budget }),
		...(request.minSavingBps === undefined ? {} : { minSavingBps: request.minSavingBps }),
	}
}

/** One tax year: the engine's scan of the Levy at the period, stated in the CLI's money. */
export function yearOf(input: YearInput): YearRows | AppError {
	const { placed, report, period } = input
	const money = moneyOf(placed.currency)
	const said = contributionSavings(input.levy, period, optionsOf(input))
	if (!said.ok)
		return allowancesRefusal(said.problem, { levy: report.id, period, request: input.request })
	const rows = said.labels.map((item): AllowanceRowView => {
		const found = targetOf(
			placed.document.flows,
			item.label,
			placed.document.cashflow.withdraw.map(withdrawAccount),
		)
		const target = found.target
		const row = {
			levy: report.id,
			from: period.from,
			to: period.to,
			label: item.label,
			planned: money(item.plannedFunded),
			extra: money(item.extra),
			saving: money(item.saving),
			stoppedBy: item.stoppedBy,
		}
		if (item.extra === 0) return row
		const flow = flowOf({
			label: item.label,
			amount: row.extra,
			to: period.to,
			asOf: placed.timeline.start,
			target,
			taken: input.taken,
		})
		return target === undefined
			? { ...row, flow, hint: noTargetHint(item.label, found.withdrawn) }
			: { ...row, flow }
	})
	// The year's saving is the engine's own label savings added: its exact identity with
	// dueBefore minus dueAfter is sim ADR-0022's, and the CLI subtracts nothing (cli ADR-0036).
	const saved = said.labels.reduce((total, item) => total + item.saving, 0)
	const rules = placed.document.levies?.find((it) => it.id === report.id)
	const assumptions =
		rules === undefined ? [] : assumptionViews(thLevyAssumptions(rules, period.measures))
	return {
		year: {
			levy: report.id,
			from: period.from,
			to: period.to,
			settlementDate: period.settlementDate,
			dueBefore: money(said.dueBefore),
			dueAfter: money(said.dueAfter),
			saving: money(saved),
			assumptions,
		},
		rows,
	}
}
