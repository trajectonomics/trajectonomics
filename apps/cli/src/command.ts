import type { z } from "zod"
import { checkDocument, type FlagDocument } from "./document"
import type { DocumentSpec } from "./document-spec"
import type { AppError, ErrorCode } from "./errors"
import { checkPositionals, deriveFlags, type FlagSpec } from "./flags"
import type { RenderHint } from "./table"

export type { DocumentSpec, RequiredDocumentField } from "./document-spec"

export type Env = Readonly<Record<string, string | undefined>>

/** What a command returns on success: structure only. The envelope layer renders it. */
export type Result<T = unknown> = { readonly ok: true; readonly data: T }

export function ok<T>(data: T): Result<T> {
	return { ok: true, data }
}

export type Example = { command: string; description: string }

/** What a running command may read from the outside world. */
export type Context = {
	env: Env
	root: Group
	/** Reads all of stdin; only a form that names `-` calls it: a document form, or `tx import -`. */
	stdin: () => Promise<string>
	/**
	 * Writes one progress line to stderr while a command runs, outside its result. Only a leaf that
	 * keeps running, such as `dashboard`, calls it; the result is still the one envelope on stdout.
	 */
	notify?: (line: string) => void
	/**
	 * Lines to print on stderr only if the run succeeds, after its result: a note about something
	 * the run did on the way, such as migrating the database (cli ADR-0050). A failed run answers
	 * with its envelope alone, so nothing here is printed beside one.
	 */
	afterSuccess?: string[]
	source?: import("./store/types").Source // the clock and ids a write reads; only the demo entry sets it (ADR-0074)
}

type Outcome<T> = Result<T> | AppError | Promise<Result<T> | AppError>

/** A command's run arguments: the document is present only when the leaf declares one. */
type RunArgs<I extends z.ZodObject, D extends z.ZodType | undefined> = D extends z.ZodType
	? [input: z.output<I>, document: z.output<D>, ctx: Context]
	: [input: z.output<I>, ctx: Context]

/**
 * A leaf command carries its summary, the schema that validates its input, the schema its result
 * must satisfy, and the function that produces that result. It never formats and never exits.
 * Flags are derived from the input schema: every field that is not a positional is a flag.
 */
export type Command<
	I extends z.ZodObject,
	O extends z.ZodType,
	D extends z.ZodType | undefined = undefined,
> = {
	name: string
	summary: string
	/** Optional prose under the summary: what the command means, beyond its one line (usage and `traj schema`). */
	description?: string
	/**
	 * An optional sentence naming the release that ships what this page describes, printed under
	 * the summary (ADR-0034). It is reader-facing prose, never a field of `traj schema`.
	 */
	note?: string
	/** Input fields filled from positional words, in order. The last may be an array. */
	positionals: readonly string[]
	input: I
	/**
	 * The alternate document form, beside the flag form (ADR-0020). The flag form's input schema
	 * stays the single source of flags, `required` and usage.
	 */
	document?: DocumentSpec<NonNullable<D>>
	/** Documents a flag names beside the other flags, published by `traj schema` (ADR-0030). */
	flagDocuments?: readonly FlagDocument[]
	output: O
	examples: readonly Example[]
	/** How a table-shaped result renders in the human Format; JSON ignores it. */
	render?: RenderHint
	/**
	 * Codes this command raises itself. Global codes such as `unknown_flag` are not listed, nor
	 * are the ones opening or creating the ledger raises, except on the leaves whose subject is the
	 * data directory itself: `init`, `inspect`, `export`, `backup`, `restore` and `data remove`.
	 */
	errorCodes: readonly ErrorCode[]
	run: (...args: RunArgs<I, D>) => Outcome<z.input<O>>
}

/** A leaf with its schema types erased and its flags derived, for the command tree. */
export type Leaf = {
	kind: "leaf"
	name: string
	summary: string
	description?: string
	note?: string
	positionals: readonly string[]
	input: z.ZodObject
	document?: DocumentSpec
	flagDocuments?: readonly FlagDocument[]
	output: z.ZodType
	flags: readonly FlagSpec[]
	examples: readonly Example[]
	render?: RenderHint
	errorCodes: readonly ErrorCode[]
	run: (input: unknown, document: unknown, ctx: Context) => Outcome<unknown>
}

/** A named set of subcommands. It has no `run`: a bare group is invalid input (ADR-0015). */
export type Group = {
	kind: "group"
	name: string
	summary: string
	/** The release note a shipped page carries (ADR-0034), rendered under the summary. */
	note?: string
	children: readonly Node[]
}

export type Node = Leaf | Group

/** Keeps the schema types checked against `run`, then erases them for the tree. */
export function defineCommand<
	I extends z.ZodObject,
	O extends z.ZodType,
	D extends z.ZodType | undefined = undefined,
>(command: Command<I, O, D>): Leaf {
	checkPositionals(command.input, command.positionals)
	checkDocument(command.input, command.document)
	const flags = deriveFlags(command.input, command.positionals)
	// A command without a document form takes (input, ctx); the leaf's call site always passes
	// the document slot, so adapt the two shapes here, once, where the types are still known.
	const run =
		command.document === undefined
			? (input: unknown, _document: unknown, ctx: Context) =>
					(command.run as unknown as (input: unknown, ctx: Context) => Outcome<unknown>)(input, ctx)
			: (command.run as unknown as Leaf["run"])
	return { kind: "leaf", ...command, run, flags } as unknown as Leaf
}

export function defineGroup(group: Omit<Group, "kind">): Group {
	const names = group.children.map((child) => child.name)
	const hidden = names.find((name) => name.startsWith("-") || name === "")
	if (hidden !== undefined) throw new Error(`Child name "${hidden}" could never be reached.`)
	const duplicate = names.find((name, index) => names.indexOf(name) !== index)
	if (duplicate) throw new Error(`Group "${group.name}" has two children named "${duplicate}".`)
	return { kind: "group", ...group }
}
