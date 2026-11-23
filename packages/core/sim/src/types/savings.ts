import type { BasisPoints, MinorUnits } from "./common"
import type { InputProblem, ValueOverflowProblem } from "./projection"

/** What `contributionSavings` is asked: the labels to raise, in order, and how far and how finely. */
export interface SavingsOptions {
	/** Contribution Tally labels, each read by a `funded` `tally` Measure of the Levy; no label twice. */
	readonly labels: readonly string[]
	/** The size of one step in minor units, at least 1. */
	readonly step: MinorUnits
	/** The Scenario's inflation, which resolves `const` growth as the Projection did. */
	readonly inflation: BasisPoints
	/** The most the extra contributions of every label may add up to; absent means no limit. */
	readonly budget?: MinorUnits
	/** The least share of a step, in basis points, a step must save to be taken; default 0. */
	readonly minSavingBps?: BasisPoints
	/** The most steps taken over every label; the search refuses past it. At least 1. */
	readonly maxSteps: number
}

/** Why a label's steps stopped: its next step saved nothing, saved too little, or did not fit the budget. */
export type SavingStop = "noSaving" | "belowMinSaving" | "budget"

/** One label's answer: whole steps added on top of what the period already funded under it. */
export interface LabelSaving {
	readonly label: string
	/** The period's funded tally for the label before any step. */
	readonly plannedFunded: MinorUnits
	/** Steps taken times the step; 0 when the first step was not taken. */
	readonly extra: MinorUnits
	/** The fall in `due` the label's steps caused. */
	readonly saving: MinorUnits
	readonly stoppedBy: SavingStop
}

/** `dueBefore - dueAfter` equals the sum of the labels' savings exactly. */
export type SavingsResult =
	| {
			readonly ok: true
			readonly dueBefore: MinorUnits
			readonly dueAfter: MinorUnits
			readonly labels: readonly LabelSaving[]
	  }
	| { readonly ok: false; readonly problem: ValueOverflowProblem | InputProblem }
