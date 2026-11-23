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
}

const NO_TARGET_HINT = (label: string): string =>
	`No contribution of this plan carries ${label}. Add the asset Account that will hold it to the Scenario, then add this Flow with that Account as its target.`

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
		const target = targetOf(placed.document.flows, item.label)
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
		})
		return target === undefined
			? { ...row, flow, hint: NO_TARGET_HINT(item.label) }
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
