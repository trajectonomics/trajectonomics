import { type AppError, fail, isAppError } from "../errors"
import { type CarryInRecordForm, readCarryIn } from "./carryin"
import { type ModelSource, modelSourceOf } from "./chance-plan"

/*
 * The two documents `projection path` reads before the Store opens: the Return model, and what each
 * Levy's period already tallied (cli ADR-0032, ADR-0069). Standard input can be read once, so the
 * check that only one of them comes from `-` lives here, where both are read.
 */

export type PathDocuments = {
	source: ModelSource
	records: readonly CarryInRecordForm[]
}

/** Read `--return-model`, `--buckets` and `--carry-in`, or the refusal that names the flag. */
export async function pathDocumentsOf(
	input: { returnModel: string; buckets?: number | undefined; carryIn?: string | undefined },
	stdin: () => Promise<string>,
): Promise<PathDocuments | AppError> {
	if (input.returnModel === "-" && input.carryIn === "-") {
		return fail("invalid_input", {
			path: "--carry-in",
			message: "--carry-in: standard input already holds the Return model",
			hint: "Read one of the two documents from a file: --return-model PATH or --carry-in PATH.",
		})
	}
	const source = await modelSourceOf(input, stdin)
	if (isAppError(source)) return source
	const records = input.carryIn === undefined ? [] : await readCarryIn(input.carryIn, stdin)
	if (isAppError(records)) return records
	return { source, records }
}
