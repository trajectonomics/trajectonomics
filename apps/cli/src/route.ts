import type { Group, Leaf } from "./command"
import { type AppError, fail, isAppError } from "./errors"
import { parseInput } from "./input"
import { type Parsed, parseNodeArgs } from "./parse"
import { findNode, missingCommand, unknownCommand, walk } from "./tree"

export type Stdin = () => Promise<string>

export type Invocation = { leaf: Leaf; path: string[]; input: unknown; document?: unknown }

function builtIn(root: Group, name: string, input: unknown): Invocation | AppError {
	const leaf = findNode(root, [name])
	if (leaf?.kind !== "leaf") return fail("internal")
	return { leaf, path: [name], input }
}

/**
 * A group named with no command under it: the root lists the commands, every other group is
 * invalid input, and a word left after a bare `--` is still an unknown command.
 */
function atGroup(root: Group, path: string[], parsed: Parsed): Invocation | AppError {
	const stray = parsed.positionals[0]
	if (stray !== undefined) return unknownCommand(path, stray)
	return path.length === 0 ? builtIn(root, "help", { path }) : missingCommand(path)
}

/**
 * Decides what to run: `--version` and `--help` win, the root lists the commands, and any other
 * group named with no command under it is invalid input.
 */
export async function route(
	argv: string[],
	root: Group,
	stdin: Stdin,
): Promise<Invocation | AppError> {
	const landed = walk(root, argv)
	if (isAppError(landed)) return landed
	const { node, path, rest } = landed
	const parsed = parseNodeArgs(node.kind === "leaf" ? node.flags : [], rest, path)
	if (isAppError(parsed)) return parsed
	if (parsed.version) return builtIn(root, "version", {})
	if (parsed.help) return builtIn(root, "help", { path })
	if (node.kind === "group") return atGroup(root, path, parsed)
	const input = await parseInput(node, parsed, path, stdin)
	if (isAppError(input)) return input
	const document = input.document === undefined ? {} : { document: input.document }
	return { leaf: node, path, input: input.input, ...document }
}
