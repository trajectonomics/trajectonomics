import { thFilerLabel } from "@trajectonomics/core/tax/th"
import type { ScenarioDocument } from "../document"
import { printedCommand } from "../hint-command"
import type { Household } from "../household/model"
import { resolveOwners } from "../household/owner-held"
import { ownedSegments } from "../household/owner-rules"
import { formatPath } from "../path"
import { quotedName } from "../quoted-name"
import { isTaxed } from "../shown"
import { hasFilerLevy } from "../tax/filer-label-check"
import { flowsOf } from "../tax/labels"
import type { UnlabelledIncome } from "./shape"

/** The label a salary Flow is tallied under, before a Levy with Filers adds its suffix. */
const SALARY_LABEL = "income.section40_1"

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

/** The label the hint suggests, and the words naming who may earn, for a Levy with Filers. */
function suggestionOf(
	owner: string | undefined,
	household: Household | null,
): { label: string; words: string } {
	const label = owner === undefined ? null : suffixed(SALARY_LABEL, owner)
	if (label !== null) return { label, words: "" }
	const people = earnersOf(household)
	const choices = people.length === 0 ? "" : `: one of ${people.join(", ")}`
	return {
		label: `${SALARY_LABEL}@<person>`,
		words: `, with the Filer suffix of whoever earns it (@<person>${choices})`,
	}
}

/**
 * The income Flows a taxed plan gives no label, in document order (cli ADR-0083). No Levy is told
 * about one, so its income never reaches the tax; the hint states a Section 40 label, or another one.
 * A Levy with Filers reads only suffixed labels, so the hint carries the Owner's suffix, or names
 * the choices when no Owner says whose the income is.
 */
export function unlabelledIncomeItems(
	name: string,
	document: ScenarioDocument,
	household: Household | null,
): UnlabelledIncome[] {
	if (!isTaxed(document)) return []
	const owners = ownersOf(household, document)
	return flowsOf(document)
		.filter((flow) => flow["kind"] === "income" && typeof flow["label"] !== "string")
		.map((flow) => {
			const id = String(flow["id"] ?? "")
			const path = formatPath(["flows", id, "label"])
			const suggestion = hasFilerLevy(document)
				? suggestionOf(owners.get(`flows.${id}`), household)
				: { label: SALARY_LABEL, words: "" }
			const value = quotedName(`${path}=${JSON.stringify(suggestion.label)}`)
			const command = printedCommand("traj scenario apply", [name], ["--set", value])
			return {
				kind: "unlabelled-income" as const,
				path,
				value: null,
				hint: `Run "${command}" for a salary${suggestion.words}, or name another label from "traj schema scenario apply".`,
			}
		})
}
