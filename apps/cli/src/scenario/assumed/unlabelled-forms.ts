import type { ScenarioDocument } from "../document"
import { printedCommand } from "../hint-command"
import { quotedName } from "../quoted-name"
import { filerOfTaxLevy, taxLevyIds } from "../tax/levy-ids"

/** The label a salary Flow is tallied under, before a Levy with Filers adds its suffix. */
export const SALARY_LABEL = "income.section40_1"

/** The filing the plan's Levies state: a separate Return files one Levy per Filer (cli ADR-0075). */
function statusOf(document: ScenarioDocument): "married_joint" | "married_separate" {
	return taxLevyIds(document).some((id) => filerOfTaxLevy(id) !== undefined)
		? "married_separate"
		: "married_joint"
}

/** One `--label <id>=<label>`: after `=` when the id would otherwise read as a flag (cli ADR-0048). */
function labelFlags(ids: readonly string[]): string[] {
	return ids.flatMap((id) => {
		const value = quotedName(`${id}=${SALARY_LABEL}`)
		return id.startsWith("-") ? [`--label=${value}`] : ["--label", value]
	})
}

/** The tax write that labels every unlabelled Flow with an Owner, from the profile or stated whole. */
export function taxForm(
	name: string,
	document: ScenarioDocument,
	ids: readonly string[],
	stored: boolean,
): string {
	const mode = stored
		? ["--from-stored"]
		: ["--tax", "th-2026", "--filing-status", statusOf(document)]
	return printedCommand("traj scenario tax", [name], [...mode, ...labelFlags(ids)])
}

/**
 * The sentence above the tax form, naming what the write states (cli ADR-0083). The whole form
 * writes a new Levy rather than building on one, so it drops whatever flags the plan's Levy stated;
 * the sentence says so before printing the form a person would run.
 */
export function taxHint(form: string, stored: boolean): string {
	if (!stored) {
		return `This write replaces the plan's Levy, so add every flag the profile needs (children, allowances and the rest; "traj schema scenario tax" lists them) before running it. Run "${form}" to write the tax and every unlabelled income Flow's salary label with its Owner's Filer suffix, or name another label from "traj schema scenario apply".`
	}
	return `Run "${form}" to write every unlabelled income Flow's salary label with its Owner's Filer suffix, or name another label from "traj schema scenario apply".`
}

/** The way out for the items no Owner can label: giving them an Owner comes first. */
export function ownerHint(name: string, paths: readonly string[]): string {
	const form = printedCommand("traj scenario household", [name], ["--file", "<path>"])
	const subject = paths.length === 1 ? paths[0] : `each of ${paths.join(", ")}`
	const entries = paths.map((path) => JSON.stringify({ path, person: "<person id>" })).join(", ")
	const ones = paths.length === 1 ? 'an "owners" entry such as' : '"owners" entries such as'
	return `Give ${subject} an Owner first: run "${form}" with ${ones} ${entries} or "shared", so a tax write can label each with its Owner's Filer suffix.`
}
