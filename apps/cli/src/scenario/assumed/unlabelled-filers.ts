import { thFilerLabel } from "@trajectonomics/core/tax/th"
import type { ScenarioDocument } from "../document"
import { printedCommand } from "../hint-command"
import type { Household } from "../household/model"
import { resolveOwners } from "../household/owner-held"
import { ownedSegments } from "../household/owner-rules"
import { formatPath } from "../path"
import { quotedName } from "../quoted-name"
import { hasFilerLevy, levyTallyLabels } from "../tax/filer-label-check"
import { flowsOf } from "../tax/labels"

/** The label a salary Flow is tallied under, before a Levy with Filers adds its suffix. */
const SALARY_LABEL = "income.section40_1"

export type UnlabelledHint = { id: string; hint: string }

/** The people who can own an income Flow and file: the holder and the partner, never a dependent. */
function earnersOf(household: Household | null): string[] {
	return (household?.people ?? [])
		.filter((person) => person.role !== "dependent")
		.map((person) => person.id)
}

/** Each owned Flow's person, keyed as its tax slot names it, `flows.<id>`. */
function ownersOf(household: Household | null, document: ScenarioDocument): Map<string, string> {
	const owners = household === null ? [] : (resolveOwners(household, document).owners ?? [])
	return new Map(
		owners.flatMap((owner) => {
			const segments = ownedSegments(owner.path)
			return segments === null ? [] : [[segments.join("."), owner.person] as const]
		}),
	)
}

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

/** The hint that writes every unlabelled Flow's label through a `scenario tax --from-stored` write. */
function taxHint(name: string, ids: readonly string[]): string {
	const labels = ids.flatMap((id) => ["--label", quotedName(`${id}=${SALARY_LABEL}`)])
	const command = printedCommand("traj scenario tax", [name], ["--from-stored", ...labels])
	return `Run "${command}" to write every unlabelled income Flow's salary label with its Owner's Filer suffix, or name another label from "traj schema scenario apply".`
}

/**
 * The label hint for each unlabelled income Flow (cli ADR-0075, ADR-0083). A Levy with Filers reads
 * only the suffixes it tallies, so an Owner's suffix it does not read gives the `--from-stored` form,
 * which writes the label under the Owner's suffix and adds that person to the Levy. A Flow with no
 * Owner names the suffixes the Levies do read, or falls back to the same form.
 */
export function unlabelledHintsOf(
	name: string,
	document: ScenarioDocument,
	household: Household | null,
): UnlabelledHint[] {
	const owners = ownersOf(household, document)
	const flows = flowsOf(document)
		.filter((flow) => flow["kind"] === "income" && typeof flow["label"] !== "string")
		.map((flow) => {
			const id = String(flow["id"] ?? "")
			return { id, owner: owners.get(`flows.${id}`) }
		})
	if (!hasFilerLevy(document)) {
		return flows.map(({ id }) => ({ id, hint: setHint(name, id, SALARY_LABEL, "") }))
	}
	const read = levyTallyLabels(document)
	const fallback = taxHint(
		name,
		flows.map((flow) => flow.id),
	)
	const choices = choicesOf(read, household)
	return flows.map(({ id, owner }) => {
		const label = owner === undefined ? null : suffixed(SALARY_LABEL, owner)
		if (label !== null && read.has(label)) return { id, hint: setHint(name, id, label, "") }
		if (owner !== undefined || choices.length === 0) return { id, hint: fallback }
		const words = `, with the Filer suffix of whoever earns it (@<person>: one of ${choices.join(", ")})`
		return { id, hint: setHint(name, id, `${SALARY_LABEL}@<person>`, words) }
	})
}
