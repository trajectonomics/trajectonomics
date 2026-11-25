/**
 * The contribution Tally labels the Thai Levy reads as a funded contribution, each with the name a person
 * reads (cli ADR-0061, `traj schema projection allowances`). The order is the order the page offers them in.
 */
export const ALLOWANCE_LABELS = [
	{ label: "allowance.retirement.rmf", name: "RMF" },
	{ label: "allowance.thai_esg", name: "ThaiESG" },
	{ label: "allowance.retirement.pvd", name: "Provident fund" },
	{ label: "allowance.retirement.gpf", name: "Government pension fund" },
	{ label: "allowance.retirement.nsf", name: "National Savings Fund" },
	{ label: "allowance.retirement.pension_life", name: "Pension life insurance" },
] as const

/** The SSF label: the Levy still reads it, and from the 2025 tax year it allows nothing (tax ADR 0007). */
export const SSF_LABEL = "allowance.retirement.ssf"

/** What the page says of SSF instead of offering it: purchases are no longer deductible. */
export const SSF_NOTE = "SSF purchases are no longer deductible from 2025."

/** Every label the CLI accepts at `--labels`, SSF included. */
export const KNOWN_LABELS: readonly string[] = [...ALLOWANCE_LABELS.map((a) => a.label), SSF_LABEL]

/** The readable name of a label: the Levy's own for the ones it names, the label itself for any other. */
export function allowanceName(label: string): string {
	if (label === SSF_LABEL) return "SSF"
	return ALLOWANCE_LABELS.find((entry) => entry.label === label)?.name ?? label
}
