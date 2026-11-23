import type { DocumentSpec, RequiredDocumentField } from "../command"
import { type AppError, fail } from "../errors"
import { decimalDocument } from "./decimal-schema"
import { scenarioDocument } from "./document-form"

/** The input fields `scenario apply` reads; the two forms share one input schema. */
export type ApplyFlags = {
	name?: string | undefined
	file?: string | undefined
	template?: boolean | undefined
	asOf?: string | undefined
	dryRun?: boolean | undefined
	decimal?: boolean | undefined
	ifHash?: string | undefined
}

/** The document form cannot work without a name, and says so before it reads the document. */
export const REQUIRED_NAME: RequiredDocumentField = {
	field: "name",
	sentence: "name the Scenario to apply the document to",
}

/** What a caller should run instead of a document beside the flags it cannot take (ADR-0044). */
const FORM_HINT =
	'Run "traj scenario apply --template --as-of <date>" to print a Scenario pre-filled from the Baseline, or "traj scenario apply <name> --file <path>" to apply a document.'

export const DOCUMENT: DocumentSpec<typeof scenarioDocument> = {
	flag: "file",
	schema: scenarioDocument,
	allowed: ["name", "dryRun", "decimal", "ifHash"],
	required: [REQUIRED_NAME],
	hint: FORM_HINT,
	alternate: { flag: "decimal", schema: decimalDocument },
}

/**
 * The forms are exclusive, and neither is inferred. The checks live in `run`, not in a refine, so
 * their paths and sentences stay CLI-owned; `--file` beside `--template` is refused earlier, by the
 * document form's own exclusivity check (ADR-0020, ADR-0033).
 */
/** `--template` takes none of the flags that write, and names each one it refuses (ADR-0033). */
function templateRefusal(input: ApplyFlags): AppError | undefined {
	if (input.template === true && input.dryRun === true) {
		return fail("invalid_input", {
			path: "dryRun",
			message: "dryRun: --template takes no --dry-run",
		})
	}
	if (input.template === true && input.decimal === true) {
		return fail("invalid_input", {
			path: "decimal",
			message: "decimal: --template prints minor units, so it takes no --decimal",
			hint: 'Run "traj scenario apply <name> --file <path> --decimal" to apply a document in decimal form.',
		})
	}
	if (input.template === true && input.ifHash !== undefined) {
		return fail("invalid_input", {
			path: "ifHash",
			message: "ifHash: --template writes nothing, so it takes no --if-hash",
		})
	}
	if (input.template === true && input.name !== undefined) {
		return fail("invalid_input", { path: "name", message: "name: --template takes no name" })
	}
	return undefined
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
	if (input.template !== true && input.file === undefined) {
		return fail("invalid_input", {
			path: "file",
			message: "file: name a JSON document, - for stdin, or --template",
			hint: 'Run "traj scenario apply --template" to print a document to start from.',
		})
	}
	return undefined
}
