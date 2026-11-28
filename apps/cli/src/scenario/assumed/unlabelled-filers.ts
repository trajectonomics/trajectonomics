import { thFilerLabel } from "@trajectonomics/core/tax/th"
import type { ScenarioDocument } from "../document"
import { printedCommand } from "../hint-command"
import type { Household } from "../household/model"
import { formatPath } from "../path"
import { quotedName } from "../quoted-name"
import { hasFilerLevy, levyTallyLabels } from "../tax/filer-label-check"
import { earnersOf, type Flow, ownerlessPathsOf, unlabelledFlowsOf } from "./unlabelled-flows"
import { ownerHint, SALARY_LABEL, taxForm, taxHint } from "./unlabelled-forms"

/** One unlabelled income Flow's id, and the hint that states its label. */
export type UnlabelledHint = { id: string; hint: string }

/** The label with `filer`'s suffix, or null when the CLI's own rule refuses that id as a suffix. */
function suffixed(label: string, filer: string): string | null {
	try {
		return thFilerLabel(label, filer)
	} catch {
		return null
	}
}

/** The choices a Flow with no Owner gets: the people whose label the Levies read, then `shared`. */
function choicesOf(read: ReadonlySet<string>, household: Household | null): string[] {
	const people = earnersOf(household).filter((person) => {
		const label = suffixed(SALARY_LABEL, person)
		return label !== null && read.has(label)
	})
	return read.has(`${SALARY_LABEL}@shared`) ? [...people, "shared"] : people
}

/** A `--set` hint for one Flow, with `words` naming the suffixes when it has no Owner. */
function setHint(name: string, id: string, label: string, words: string): string {
	const path = formatPath(["flows", id, "label"])
	const value = quotedName(`${path}=${JSON.stringify(label)}`)
	const command = printedCommand("traj scenario apply", [name], ["--set", value])
	return `Run "${command}" for a salary${words}, or name another label from "traj schema scenario apply".`
}

/** The hint that writes every unlabelled Flow's label through one `scenario tax` write. */
function taxWriteHint(
	name: string,
	document: ScenarioDocument,
	flows: readonly Flow[],
	stored: boolean,
): string {
	const ids = flows.map((flow) => flow.id)
	return taxHint(taxForm(name, document, ids, stored), stored)
}

/** One Flow's hint: a suffix the Levy reads, the tax write, or giving an Ownerless Flow an Owner. */
function hintFor(
	name: string,
	flow: Flow,
	read: ReadonlySet<string>,
	choices: readonly string[],
	ownerless: readonly string[],
	fallback: string,
): string {
	const { id, owner } = flow
	const label = owner === undefined ? null : suffixed(SALARY_LABEL, owner)
	if (label !== null && read.has(label)) return setHint(name, id, label, "")
	if (owner !== undefined) return ownerless.length === 0 ? fallback : ownerHint(name, ownerless)
	if (choices.length === 0) return ownerHint(name, ownerless)
	const words = `, with the Filer suffix of whoever earns it (@<person>: one of ${choices.join(", ")})`
	return setHint(name, id, `${SALARY_LABEL}@<person>`, words)
}

/**
 * The label hint for each unlabelled income Flow (cli ADR-0075, ADR-0083). A Levy with Filers reads
 * only the suffixes it tallies, so an Owner's suffix it does not read gives one `scenario tax` write
 * that labels every unlabelled Flow. That write needs every taxed Flow and Account to have an Owner,
 * so while one has none the hint says to give it an Owner first. A Flow with no Owner names the
 * suffixes the Levies read, or says to give it an Owner when they read none.
 */
export function unlabelledHintsOf(
	name: string,
	document: ScenarioDocument,
	household: Household | null,
	stored: boolean,
): UnlabelledHint[] {
	const flows = unlabelledFlowsOf(household, document)
	if (!hasFilerLevy(document)) {
		return flows.map(({ id }) => ({ id, hint: setHint(name, id, SALARY_LABEL, "") }))
	}
	const read = levyTallyLabels(document)
	const choices = choicesOf(read, household)
	const ownerless = ownerlessPathsOf(household, document)
	const fallback = taxWriteHint(name, document, flows, stored)
	return flows.map((flow) => ({
		id: flow.id,
		hint: hintFor(name, flow, read, choices, ownerless, fallback),
	}))
}
