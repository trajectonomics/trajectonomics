import { type AppError, fail } from "../errors"
import type { ApplyFlags } from "./apply-forms"
import { WHAT_IF_HINT } from "./what-if-form"

/**
 * `--template` with a name is the write form, and it needs the As-of the write pre-fills from
 * (cli ADR-0084). The print form takes no --dry-run or --if-hash; the write form takes no --decimal
 * or --if-hash, since it prints the stored document (ADR-0033).
 */
function writesRefusal(input: ApplyFlags): AppError | undefined {
	if (input.name !== undefined && input.asOf === undefined) {
		return fail("invalid_input", {
			path: "asOf",
			message: "asOf: writing a template under a name needs the date to pre-fill it from",
			hint: 'Run "traj scenario apply <name> --template --as-of <date>" to save the template at that date.',
		})
	}
	if (input.name === undefined && input.dryRun === true) {
		return fail("invalid_input", {
			path: "dryRun",
			message: "dryRun: --template without a name prints a document and writes nothing",
		})
	}
	if (input.name !== undefined && input.decimal === true) {
		return fail("invalid_input", {
			path: "decimal",
			message: "decimal: --template writes the Baseline's document in minor units",
		})
	}
	if (input.ifHash !== undefined) {
		return fail("invalid_input", {
			path: "ifHash",
			message: "ifHash: --template takes no --if-hash",
		})
	}
	return undefined
}

/** `--template` prints a document, so it takes no Set or removal: the what-if form does (cli ADR-0057). */
function whatIfRefusal(input: ApplyFlags): AppError | undefined {
	const set = (input.set?.length ?? 0) > 0
	const without = (input.without?.length ?? 0) > 0
	if (!set && !without && (input.add?.length ?? 0) === 0) return undefined
	const path = set ? "set" : without ? "without" : "add"
	return fail("invalid_input", {
		path,
		message: `${path}: --template prints a document, so it takes no --set, --without or --add`,
		hint: WHAT_IF_HINT,
	})
}

/** What `--template` refuses beside its forms, or undefined when it takes every flag it was given. */
export function templateRefusal(input: ApplyFlags): AppError | undefined {
	if (input.template !== true) return undefined
	return writesRefusal(input) ?? whatIfRefusal(input)
}
