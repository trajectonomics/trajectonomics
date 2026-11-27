import type { z } from "zod"

/** A field the document form cannot work without, and the sentence naming what is missing. It is
 * checked before the document is read, and the usage line marks it required (ADR-0020). */
export type RequiredDocumentField = { field: string; sentence: string }

/**
 * A leaf's second input form: a JSON document named by `flag` (a path, or `-` for stdin). The
 * document schema is a shape of its own; `allowed` names the flags that may accompany it, and
 * every other input field is exclusive to the flag form (ADR-0020). `required` names the input
 * fields the document form needs, in the order a caller fixes them.
 */
export type DocumentSpec<D extends z.ZodType = z.ZodType> = {
	flag: string
	schema: D
	allowed?: readonly string[]
	required?: readonly RequiredDocumentField[]
	/** The hint a refusal of the document flag beside a flag it cannot take carries. */
	hint?: string
	/**
	 * The hint for one flag the document form cannot take, when that flag names a form of its own;
	 * `hint` serves every other flag (cli ADR-0057).
	 */
	exclusiveHints?: Readonly<Record<string, string>>
	/**
	 * A second form of the same document, taken instead of `schema` when the boolean input field
	 * `flag` is true, such as `--decimal` (ADR-0047). It is published by `traj schema` beside the
	 * first, and the two never mix: the flag selects one schema before the document is read.
	 */
	alternate?: { flag: string; schema: z.ZodType }
	/**
	 * A flag-only form of the same leaf, taken with no document: `fields` are the input fields its
	 * own usage line prints in order, `required` the ones a caller has to give, and `note` a
	 * sentence printed under the line. `scenario apply --set/--without/--add` is the one form today
	 * (cli ADR-0057).
	 */
	flagForm?: {
		fields: readonly string[]
		required?: readonly string[]
		note?: string
	}
}
