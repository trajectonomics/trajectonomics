import { readFileSync } from "node:fs"
import { z } from "zod"
import type { DocumentSpec, RequiredDocumentField } from "./command"
import { documentFailure } from "./document-issues"
import { type AppError, fail } from "./errors"

/**
 * A document a flag names beside the other flags, such as `--carry-in <path>` (ADR-0030). It is
 * not the document form: the flag may be combined with the rest, so it is published under its own
 * key instead of replacing the input schema the way `DocumentSpec` does.
 */
export type FlagDocument = {
	flag: string
	schema: z.ZodType
}

/** Fields that only the flag form uses: everything not the document flag or an allowed field. */
export function exclusiveFields(input: z.ZodObject, spec: DocumentSpec): string[] {
	const keep = new Set([spec.flag, ...(spec.allowed ?? [])])
	return Object.keys(input.shape).filter((field) => !keep.has(field))
}

/** The flags the document form accepts, validated as their own strict object. */
export function selectionSchema(input: z.ZodObject, spec: DocumentSpec): z.ZodObject {
	const keep = new Set([spec.flag, ...(spec.allowed ?? [])])
	const shape = Object.fromEntries(
		Object.entries(input.shape).filter(([field]) => keep.has(field)),
	) as Record<string, z.ZodType>
	return z.strictObject(shape)
}

/**
 * The failure for a field the document form cannot work without, raised before the document is
 * read. The field is a positional's declared name today, so the path is the field itself.
 */
export function missingFieldError(required: RequiredDocumentField): AppError {
	return fail("invalid_input", {
		path: required.field,
		message: `${required.field}: ${required.sentence}`,
	})
}

/** Fails at definition time if the document form names a field that is not an input field. */
export function checkDocument(input: z.ZodObject, document: DocumentSpec | undefined): void {
	if (document === undefined) return
	if (!(document.flag in input.shape)) {
		throw new Error(`Document flag "${document.flag}" is not a field of the input schema.`)
	}
	for (const field of document.allowed ?? []) {
		if (!(field in input.shape)) {
			throw new Error(`Document field "${field}" is not a field of the input schema.`)
		}
	}
	for (const { field } of document.required ?? []) {
		if (!(field in input.shape)) {
			throw new Error(`Required document field "${field}" is not a field of the input schema.`)
		}
	}
	checkAlternate(input, document)
}

/** The alternate form's flag is an input field the document form allows (ADR-0047). */
function checkAlternate(input: z.ZodObject, document: DocumentSpec): void {
	const flag = document.alternate?.flag
	if (flag === undefined) return
	if (!(flag in input.shape)) {
		throw new Error(`Alternate document flag "${flag}" is not a field of the input schema.`)
	}
	if (!(document.allowed ?? []).includes(flag)) {
		throw new Error(`Alternate document flag "${flag}" must be allowed beside the document.`)
	}
}

/** A document field is `-` for stdin, otherwise a path resolved against the working directory. */
export async function readDocument(
	ref: string,
	path: string,
	stdin: () => Promise<string>,
): Promise<string | AppError> {
	if (ref === "-") {
		try {
			return await stdin()
		} catch {
			return fail("invalid_input", {
				path,
				message: `${path}: the document could not be read from stdin`,
			})
		}
	}
	try {
		return readFileSync(ref, "utf8")
	} catch {
		return fail("invalid_input", {
			path,
			message: `${path}: cannot read the document at "${ref}"`,
		})
	}
}

/**
 * Empty text is invalid input; JSON syntax and shape errors both name the document's field. The
 * schema is the spec's own unless the caller has selected its alternate form (ADR-0047).
 */
export function parseDocument<D extends z.ZodType>(
	spec: DocumentSpec<D>,
	text: string,
	path: string,
	schema: z.ZodType = spec.schema,
): z.output<D> | AppError {
	if (text.trim() === "") {
		return fail("invalid_input", { path, message: `${path}: the document is empty` })
	}
	let value: unknown
	try {
		value = JSON.parse(text)
	} catch {
		return fail("invalid_input", { path, message: `${path}: the document is not valid JSON` })
	}
	const result = schema.safeParse(value, { reportInput: true })
	// The alternate form's schema accepts any JSON value, so its output is the parsed value as is.
	return result.success ? (result.data as z.output<D>) : documentFailure(result.error)
}
