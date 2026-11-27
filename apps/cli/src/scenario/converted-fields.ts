import { mapDecimalFields } from "./decimal-walk"

/*
 * The values `--decimal` converts in a document (ADR-0047): every money field and every rate it
 * writes as a percent, such as an Account's `fee.bps`. The walk is the converter's own, so a hint
 * can ask what the flag would do to the rest of the input without restating which fields it reads
 * (cli ADR-0063, ADR-0067).
 */

/**
 * Every value the decimal form converts in `value`, walking the schema `schema`. The callback hands
 * each converted field back as it was, so the walk visits the same fields and in the same order as
 * the conversion itself.
 */
export function convertedValuesOf(schema: unknown, value: unknown): unknown[] {
	const found: unknown[] = []
	mapDecimalFields(schema, value, [], (field) => {
		found.push(field)
		return field
	})
	return found
}
