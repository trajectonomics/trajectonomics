import type { AgentName } from "./agents"
import type { Expected } from "./oracle"
import type { Correctness } from "./score"
import { correctCount } from "./score"

/** The row one persona's run contributes to the results table. */
export interface RunRow {
	readonly persona: string
	readonly status: string
	readonly expected: Expected
	readonly given: {
		fiDate: string | null
		tax2026Baht: number | null
		whatIfFiDate: string | null
	} | null
	readonly correctness: Correctness
	readonly calls: number
	readonly errors: number
	readonly invented: number
	readonly model: string
}

const show = (value: string | number | null): string => (value === null ? "null" : String(value))

const mark = (ok: boolean): string => (ok ? "yes" : "no")

/** The Markdown results file for one release and agent: the table, then how to read it. */
export function renderReport(input: {
	readonly release: string
	readonly agent: AgentName
	readonly date: string
	readonly runRoot: string
	readonly rows: readonly RunRow[]
}): string {
	const header = [
		`# ADR 0002 eval: ${input.release} on ${input.agent}`,
		"",
		`Run ${input.date} (UTC). Raw run files: \`${input.runRoot}\`.`,
		"",
		"| Persona | Status | Correct (of 3) | FI month, given / oracle | 2026 tax, given / oracle (THB) | What-if FI month, given / oracle | traj calls | Errors | Invented flags | Model |",
		"| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |",
	]
	const body = input.rows.map((row) => {
		const given = row.given
		const fi = `${show(given?.fiDate ?? null)} / ${show(row.expected.fiMonth)} (${mark(row.correctness.fi)})`
		const tax = `${show(given?.tax2026Baht ?? null)} / ${show(row.expected.tax2026Baht)} (${mark(row.correctness.tax)})`
		const whatIf = `${show(given?.whatIfFiDate ?? null)} / ${show(row.expected.whatIfFiMonth)} (${mark(row.correctness.whatIf)})`
		return `| ${row.persona} | ${row.status} | ${correctCount(row.correctness)} | ${fi} | ${tax} | ${whatIf} | ${row.calls} | ${row.errors} | ${row.invented} | ${row.model} |`
	})
	const notes = [
		"",
		"How to read it:",
		"- **Correct** counts the three questions answered within tolerance: FI month within one month of the oracle, 2026 tax within 1 baht. A `null` FI month must match a `null` oracle month.",
		"- **traj calls** counts every `traj` invocation the agent made, logged by the shim on PATH. **Errors** counts those that exited non-zero.",
		"- **Invented flags** counts flags a call used that the command's `traj help` does not list.",
		"- The oracle is the tax core and the sim core called directly, with no agent involved. See the eval README for what each figure means.",
	]
	return [...header, ...body, ...notes, ""].join("\n")
}
