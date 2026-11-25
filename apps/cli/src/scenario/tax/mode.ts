import { type AppError, fail } from "../../errors"
import { fields } from "./claims-values"
import { changesProfile, flagOf, type TaxFlags, writesLevy } from "./flags"

/**
 * What one `scenario tax` call asks for (cli ADR-0066). `write` states the whole profile,
 * `merge` changes the flags it carries and keeps the rest of the stored profile, `stored` writes the
 * Levy again from the stored profile, and `remove` takes the Levy and the profile out.
 */
export type TaxMode =
	| { kind: "write"; flags: TaxFlags }
	| { kind: "merge"; flags: TaxFlags }
	| { kind: "stored" }
	| { kind: "remove" }

/** The full form a refusal points to when there is no stored profile to build on. */
const FULL_FORM =
	'Run "traj scenario tax <name> --tax th-2026" with every flag the profile needs, to state it whole.'

/** A mode flag beside another one it cannot join. */
function conflict(path: string, message: string, hint?: string): AppError {
	return fail("invalid_input", { path, message, ...(hint === undefined ? {} : { hint }) })
}

/** A call that names no way to write or remove a Levy cannot do anything. */
function noChoice(): AppError {
	return conflict(
		"tax",
		"scenario tax needs --tax <jurisdiction> to write a Levy, --from-stored to write it again from the stored profile, or --none to remove one.",
		"Run --tax th-2026 to apply Thailand's 2026 income tax.",
	)
}

/** The refusal for a mode flag beside `--none`, which removes what the others build on. */
function noneWith(flag: "--merge" | "--from-stored", path: string): AppError {
	return conflict(
		path,
		`--none removes the tax and its stored profile, so it cannot be combined with ${flag}.`,
	)
}

/** `--none` beside a mode flag that builds on what `--none` removes, or a flag that writes one. */
function noneConflict(flags: TaxFlags): AppError | null {
	if (flags.none !== true) return null
	if (flags.fromStored === true) return noneWith("--from-stored", "none")
	if (flags.merge === true) return noneWith("--merge", "none")
	if (!writesLevy(flags)) return null
	return conflict(
		"none",
		"--none removes the tax, so it cannot be combined with the flags that write one.",
	)
}

/** `--from-stored` and `--merge` together, or `--from-stored` beside a flag that changes the profile. */
function storedConflict(flags: TaxFlags): AppError | null {
	if (flags.merge === true) {
		return conflict(
			"fromStored",
			"--from-stored writes the stored profile as it is, so it cannot be combined with --merge, which changes it.",
		)
	}
	if (writesLevy(flags)) {
		return conflict(
			"fromStored",
			"--from-stored writes the stored profile as it is, so it takes no profile flag.",
			"To change one item, run scenario tax with --merge and that flag.",
		)
	}
	return null
}

/** `--merge` with nothing to change: it would write the Levy it already holds. */
function mergeWithoutChange(flags: TaxFlags): AppError | null {
	if (changesProfile(flags)) return null
	return conflict(
		"merge",
		"--merge needs the profile flag to change, such as --children 2.",
		"To write the Levy again from the stored profile, use --from-stored.",
	)
}

/** The refusal for a profile flag with no `--tax`: it would be ignored, so it is refused instead. */
function missingTax(flags: TaxFlags): AppError | null {
	if (flags.tax !== undefined || !changesProfile(flags)) return null
	const field =
		flags.filingStatus !== undefined
			? "filingStatus"
			: (fields().find((it) => flags[it] !== undefined) ?? "children")
	return conflict(
		field,
		`${flagOf(field)} needs --tax: without it no Levy is written and the flag would be ignored.`,
	)
}

/** The mode a call asks for, or why its flags cannot be honoured together. */
export function taxModeOf(flags: TaxFlags): TaxMode | AppError {
	const refused = noneConflict(flags)
	if (refused !== null) return refused
	if (flags.fromStored === true) return storedConflict(flags) ?? { kind: "stored" }
	if (flags.merge === true) return mergeWithoutChange(flags) ?? { kind: "merge", flags }
	if (flags.tax !== undefined || changesProfile(flags)) {
		const wrong = missingTax(flags)
		return wrong ?? { kind: "write", flags }
	}
	return flags.none === true ? { kind: "remove" } : noChoice()
}

/**
 * The refusal for `--merge` or `--from-stored` on a plan that keeps no profile. A plan taxed before
 * the profile was kept has a Levy and no profile; building on its Levy would drop whatever the Levy
 * stated, so the caller states the profile whole once (cli ADR-0066).
 */
export function noStoredProfile(flag: "--merge" | "--from-stored", taxed: boolean): AppError {
	const why = taxed
		? "this plan's tax was written before its profile was kept, or its Levy was changed by hand since, so there is nothing to build on"
		: "this plan has no tax profile stored"
	return fail("invalid_input", {
		path: flag === "--merge" ? "merge" : "fromStored",
		message: `${flag} needs a stored tax profile: ${why}.`,
		hint: FULL_FORM,
	})
}
