import type { Levy, LevyReport, SettlementPeriod } from "@trajectonomics/core/sim"
import { project } from "@trajectonomics/core/sim"
import { type AppError, fail, isAppError } from "../errors"
import { fundedLabelsOf } from "./allowances-flow"
import type { AllowanceRequest } from "./allowances-input"
import { unreadLabels } from "./allowances-refusal"
import type { AllowanceRowView, AllowanceYearView } from "./allowances-rows-view"
import type { AllowancesView } from "./allowances-view"
import { yearOf } from "./allowances-year"
import type { Placed } from "./carryin-apply"
import { echoOf } from "./echo"
import { refusal } from "./engine"
import { moneyOf } from "./money"

/** The sentence a person reads under the figures: what they are, and what they leave out. */
const NOT_ADVICE =
	"These figures are what this plan's own tax rules would charge, an estimate and not tax advice. Each fund has holding rules of its own to check before buying."

const NOTHING_LEFT =
	"No whole tax year is left to suggest for: move --horizon past the end of a tax year."

function noLevy(): AppError {
	return fail("invalid_input", {
		path: "scenario",
		message: "The Scenario holds no tax Levy, so there is no tax allowance to fill.",
		hint: 'Run "traj scenario tax <name> --tax th-2026 --label <flow>=<label>" to charge Thai tax on the plan first (cli ADR-0040).',
	})
}

/** Why a period is not scanned, as the sentence a person reads; undefined when it is scanned. */
function leftOut(period: SettlementPeriod, placed: Placed): string | undefined {
	const { start, horizon } = placed.timeline
	const year = `The tax year ${period.from} to ${period.to} is left out:`
	if (period.partial) return `${year} the Projection ends on ${horizon}, before the year does.`
	if (period.to < start)
		return `${year} it ended before the As-of ${start}, so nothing can be added to it.`
	return undefined
}

/** What every tax year of every Levy gave, and the sentences for the years left out. */
type Years = { taxYears: AllowanceYearView[]; allowances: AllowanceRowView[]; left: string[] }

function scanLevy(input: {
	placed: Placed
	levy: Levy
	report: LevyReport
	request: AllowanceRequest
	into: Years
}): AppError | undefined {
	const { placed, levy, report, request, into } = input
	const read = fundedLabelsOf(levy)
	const labels = request.labels.filter((label) => read.includes(label))
	if (labels.length === 0) return undefined
	for (const period of report.periods) {
		const left = leftOut(period, placed)
		if (left !== undefined) {
			into.left.push(left)
			continue
		}
		const found = yearOf({ placed, levy, report, period, request, labels })
		if (isAppError(found)) return found
		into.taxYears.push(found.year)
		into.allowances.push(...found.rows)
	}
	return undefined
}

/**
 * `traj projection allowances`: for each whole tax year the Projection holds, how much more of each
 * contribution label would still lower the Levy's `due`, and by how much. The engine scans the
 * Levy; the CLI runs the plan, hands over each period and states the answer with the year's
 * assumptions, and writes no Scenario (cli ADR-0061).
 */
export function allowancesOf(placed: Placed, request: AllowanceRequest): AllowancesView | AppError {
	const levies = placed.document.levies ?? []
	if (levies.length === 0) return noLevy()
	const unread = unreadLabels(levies.map(fundedLabelsOf), request.labels)
	if (unread !== undefined) return unread
	const result = project(placed.baseline, placed.document, placed.timeline)
	if (!result.ok) return refusal(result.problems)
	const into: Years = { taxYears: [], allowances: [], left: [] }
	for (const report of result.projection.levies ?? []) {
		const levy = levies.find((it) => it.id === report.id)
		if (levy === undefined) continue
		const failed = scanLevy({ placed, levy, report, request, into })
		if (failed !== undefined) return failed
	}
	return resultOf(placed, request, into)
}

/** The result: the echo, the request as it was understood, and the years with the sentences about them. */
function resultOf(placed: Placed, request: AllowanceRequest, into: Years): AllowancesView {
	const money = moneyOf(placed.currency)
	const echo = echoOf(placed)
	const nothing = into.taxYears.length === 0 ? [NOTHING_LEFT] : []
	return {
		...echo,
		notes: [...echo.notes, ...into.left, ...nothing, NOT_ADVICE],
		horizon: placed.timeline.horizon,
		currency: placed.currency,
		labels: request.labels,
		step: money(request.step),
		...(request.budget === undefined ? {} : { budget: money(request.budget) }),
		...(request.minSavingBps === undefined ? {} : { minSavingBps: request.minSavingBps }),
		taxYears: into.taxYears,
		allowances: into.allowances,
	}
}
