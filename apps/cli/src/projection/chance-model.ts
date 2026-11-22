import type { ReturnModel } from "@trajectonomics/core/sim"
import { z } from "zod"
import type { FlagDocument } from "../document"
import { parseDocument, readDocument } from "../document"
import { type AppError, isAppError } from "../errors"

/*
 * `--return-model` is one JSON document the caller states: the Return model `chanceOfSuccess`
 * draws its Market paths from (sim ADR-0005, ADR-0011). The CLI ships no model. Which market
 * history a plan is tested against is a decision about the meaning of money, so the caller names
 * the file (cli issue #194).
 */

/** The flag's field, which a whole-file failure names so the dispatcher spells it `--return-model`. */
export const RETURN_MODEL_FIELD: string = "returnModel"

const bucket = z.strictObject({
	returnsBps: z
		.array(z.number().int())
		.describe(
			"One span return per Account, in the order of `accounts`, in basis points: 100 is 1% over the month.",
		),
	weight: z
		.number()
		.int()
		.min(0)
		.describe("A non-negative integer. The weights of a model sum to 4294967296 (2^32)."),
})

/** The Return model in the `sim` format. The engine checks it again against the Scenario. */
export const returnModelDocument: z.ZodType<ReturnModel> = z
	.strictObject({
		id: z.string().min(1).describe("The model's id, echoed as definition.modelId."),
		accounts: z
			.array(z.string().min(1))
			.describe(
				"The Account ids the buckets give returns for. Each must be an Account of the Scenario.",
			),
		buckets: z
			.array(bucket)
			.describe("The weighted market months a Market path draws from, one per month."),
	})
	.meta({
		description:
			"A Return model: weighted buckets of monthly returns, one per Account, that seeded Market paths draw from.",
	})

/** The `--return-model` document, published under `flagDocuments` so its shape is not guessed. */
export const returnModelFlagDocument: FlagDocument = {
	flag: RETURN_MODEL_FIELD,
	schema: returnModelDocument,
}

/** Reads and validates the flag's document before the Store opens (ADR-0020, ADR-0030). */
export async function readReturnModel(
	ref: string,
	stdin: () => Promise<string>,
): Promise<ReturnModel | AppError> {
	const text = await readDocument(ref, RETURN_MODEL_FIELD, stdin)
	if (isAppError(text)) return text
	return parseDocument(
		{ flag: RETURN_MODEL_FIELD, schema: returnModelDocument },
		text,
		RETURN_MODEL_FIELD,
	)
}
