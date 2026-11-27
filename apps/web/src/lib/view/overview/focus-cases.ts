import type { Fi, HouseholdDocument, ProjectionChance, ProjectionRun, Read } from "../../contract"
import { formatMonth, yearOf } from "../../format"
import type { PersonNames } from "../item-names"
import { annualRowsOf } from "../projection/annual"
import { facesOf } from "./focus-faces"
import { setupButton } from "./focus-setup"
import { type FocusView, SEE_PLAN, SEE_RUNS_OUT } from "./focus-types"
import { chanceSentence, runsOutSentence, SETUP_ANSWER, SETUP_SENTENCE } from "./focus-words"

/** The data of a successful Read, or null when it is missing or failed. */
export function dataOf<T>(read: Read<T> | undefined): T | null {
	return read?.ok === true ? read.data : null
}

export function setupFocus(): FocusView {
	return {
		kind: "setup",
		answer: SETUP_ANSWER,
		sentence: SETUP_SENTENCE,
		button: setupButton(),
		plan: null,
		stopDate: null,
		horizonYear: null,
		unmet: null,
		currency: null,
		faces: [],
		counts: null,
	}
}

/** Case 2: the plan's projection run states the month the money runs out. */
export function runsOutFocus(
	plan: string,
	run: ProjectionRun,
	out: NonNullable<ProjectionRun["runsOut"]>,
	household: HouseholdDocument | null,
	people: PersonNames,
): FocusView {
	const row = annualRowsOf(run).find((one) => out.date >= one.from && out.date <= one.to)
	const faces = facesOf(row?.ages ?? [], household, people)
	return {
		kind: "runsOut",
		answer: formatMonth(out.date),
		sentence: runsOutSentence(out.date, faces.find((face) => face.role === "holder")?.age ?? null),
		button: SEE_RUNS_OUT,
		plan,
		stopDate: out.date,
		horizonYear: yearOf(run.horizon),
		unmet: out.unmet,
		currency: run.currency,
		faces,
		counts: null,
	}
}

/** Cases 3 and 4: the FI read answers, reachable or not. */
export function answerFocus(
	plan: string,
	fi: Fi,
	run: ProjectionRun | null,
	sentence: string,
	chanceRead: Read<ProjectionChance> | undefined,
	household: HouseholdDocument | null,
	people: PersonNames,
): FocusView {
	if (!fi.fi.reachable) {
		return {
			kind: "unreachable",
			answer: `Not by ${yearOf(fi.horizon)}`,
			sentence,
			button: SEE_PLAN,
			plan,
			stopDate: null,
			horizonYear: yearOf(fi.horizon),
			unmet: null,
			currency: null,
			faces: [],
			counts: null,
		}
	}
	const chance = dataOf(chanceRead)
	const clause = chanceSentence(chance)
	return {
		kind: "reachable",
		answer: formatMonth(fi.fi.fiDate),
		sentence: clause === "" ? sentence : `${sentence} ${clause}`,
		button: SEE_PLAN,
		plan,
		stopDate: fi.fi.fiDate,
		horizonYear: yearOf(chance?.horizon ?? run?.horizon ?? fi.horizon),
		unmet: null,
		currency: null,
		faces: facesOf(fi.fi.ages, household, people),
		counts: chance === null ? null : { succeeded: chance.succeeded, paths: chance.paths },
	}
}
