import type { DocumentSpec, RequiredDocumentField } from "../command"
import { type AppError, fail } from "../errors"
import { decimalDocument } from "./decimal-schema"
import { scenarioDocument } from "./document-form"

/** The input fields `scenario apply` reads; the forms share one input schema. */
export type ApplyFlags = {
	name?: string | undefined
	file?: string | undefined
	template?: boolean | undefined
	asOf?: string | undefined
	dryRun?: boolean | undefined
	decimal?: boolean | undefined
	ifHash?: string | undefined
	set?: readonly string[] | undefined
	without?: readonly string[] | undefined
}

/** The document form cannot work without a name, and says so before it reads the document. */
export const REQUIRED_NAME: RequiredDocumentField = {
	field: "name",
	sentence: "name the Scenario to apply the document to",
}

/** The what-if form cannot work without the stored plan it applies to (cli ADR-0057). */
export const WHAT_IF_NAME: RequiredDocumentField = {
	field: "name",
	sentence: "name the Scenario whose plan the what-if applies to",
}

/** What a caller should run instead of a document beside the flags it cannot take (ADR-0044). */
const FORM_HINT =
	'Run "traj scenario apply --template --as-of <date>" to print a Scenario pre-filled from the Baseline, or "traj scenario apply <name> --file <path>" to apply a document.'

/** The form `--set` and `--without` take instead of a document, and what it writes (cli ADR-0057). */
export const WHAT_IF_HINT =
	'Run "traj scenario apply <name> --set <path=value>" to apply a what-if to the stored Scenario, with no document; --without <id> takes a list item out.'

export const DOCUMENT: DocumentSpec<typeof scenarioDocument> = {
	flag: "file",
	schema: scenarioDocument,
	allowed: ["name", "dryRun", "decimal", "ifHash"],
	required: [REQUIRED_NAME],
	hint: FORM_HINT,
	exclusiveHints: { set: WHAT_IF_HINT, without: WHAT_IF_HINT },
	alternate: { flag: "decimal", schema: decimalDocument },
}

/** Whether the what-if form's Overrides were given: a removal or a Set, with or without `--decimal`. */
export function isWhatIf(input: ApplyFlags): boolean {
	return (input.set?.length ?? 0) + (input.without?.length ?? 0) > 0
}

/**
 * The forms are exclusive, and neither is inferred. The checks live in `run`, not in a refine, so
 * their paths and sentences stay CLI-owned; `--file` beside `--template` or a what-if flag is refused
 * earlier, by the document form's own exclusivity check (ADR-0020, ADR-0033, cli ADR-0057).
 */
/** `--template` takes none of the flags that write, and names each one it refuses (ADR-0033). */
function templateWritesRefusal(input: ApplyFlags): AppError | undefined {
	if (input.dryRun === true) {
		return fail("invalid_input", {
			path: "dryRun",
			message: "dryRun: --template takes no --dry-run",
		})
	}
	if (input.decimal === true) {
		return fail("invalid_input", {
			path: "decimal",
			message: "decimal: --template prints minor units, so it takes no --decimal",
			hint: 'Run "traj scenario apply <name> --file <path> --decimal" to apply a document in decimal form.',
		})
	}
	if (input.ifHash !== undefined) {
		return fail("invalid_input", {
			path: "ifHash",
			message: "ifHash: --template writes nothing, so it takes no --if-hash",
		})
	}
	if (input.name !== undefined) {
		return fail("invalid_input", { path: "name", message: "name: --template takes no name" })
	}
	return undefined
}

/** `--template` prints a document, so it takes no Set or removal: the what-if form does (cli ADR-0057). */
function whatIfTemplateRefusal(input: ApplyFlags): AppError | undefined {
	if (!isWhatIf(input)) return undefined
	const path = (input.set?.length ?? 0) > 0 ? "set" : "without"
	return fail("invalid_input", {
		path,
		message: `${path}: --template prints a document, so it takes no --set or --without`,
		hint: WHAT_IF_HINT,
	})
}

function templateRefusal(input: ApplyFlags): AppError | undefined {
	if (input.template !== true) return undefined
	return templateWritesRefusal(input) ?? whatIfTemplateRefusal(input)
}

export function exclusive(input: ApplyFlags): AppError | undefined {
	const template = templateRefusal(input)
	if (template !== undefined) return template
	if (input.asOf !== undefined && input.template !== true) {
		return fail("invalid_input", {
			path: "asOf",
			message: "asOf: pre-fills a template, so it needs --template",
			hint: 'Run "traj scenario apply --template --as-of <date>" to print a Scenario pre-filled from the Baseline at that date.',
		})
	}
	if (input.template !== true && input.file === undefined && !isWhatIf(input)) {
		return fail("invalid_input", {
			path: "file",
			message: "file: name a JSON document, - for stdin, or --template",
			hint: 'Run "traj scenario apply --template" to print a document to start from.',
		})
	}
	return undefined
}
