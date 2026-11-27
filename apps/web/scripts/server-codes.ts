/**
 * The codes a Dashboard source writes, read from its TypeScript tree: an object's `code` (or shorthand), a type member
 * named `code`, and the code argument of `refused`, `refusal` and `fail`. An expression the scan cannot read fails the
 * guard, unless its file and exact text are on the allow-list with a reason. Pure: the test passes the sources in.
 */
import ts from "typescript"
import { type CodeContext, contextOf } from "./server-code-context"
import { parseSource, type Source, walk } from "./server-code-source"
import { typeCodes } from "./server-code-types"
import type { Value } from "./server-code-value"
import { valueCodes } from "./server-code-values"

export type { Source } from "./server-code-source"

/** A source's codes, and each unreadable expression as `file: text`. */
export interface Scan {
	readonly codes: string[]
	readonly hidden: string[]
}

/** The call names whose argument may be a code. */
const HELPERS: ReadonlySet<string> = new Set(["refused", "refusal", "fail"])

/** One scan's finds: every code, and each unreadable expression once. */
interface Found {
	readonly codes: string[]
	readonly hidden: Set<string>
}

/** Whether a property, type member or binding is named `code`. */
function codeName(name: ts.PropertyName): boolean {
	return (ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === "code"
}

/** A value's codes, and its exact text when the scan cannot read it. */
function record(value: Value, text: string, file: string, found: Found): void {
	found.codes.push(...value.codes)
	if (!value.read) found.hidden.add(`${file}: ${text}`)
}

/** An object's `code: …`, read from its value. */
function property(
	node: ts.PropertyAssignment,
	file: string,
	context: CodeContext,
	found: Found,
): void {
	if (!codeName(node.name)) return
	record(valueCodes(node.initializer, context), node.initializer.getText(), file, found)
}

/** A type member's `code: …`, read from its type: a union's members, or the alias it names. */
function member(
	node: ts.PropertySignature,
	file: string,
	context: CodeContext,
	found: Found,
): void {
	if (!codeName(node.name) || node.type === undefined) return
	record(typeCodes(node.type, context), node.type.getText(), file, found)
}

/** `{ code }` states no code of its own, so it is reported unless the file says why it passes one through. */
function shorthand(node: ts.ShorthandPropertyAssignment, file: string, found: Found): void {
	if (node.name.text === "code") found.hidden.add(`${file}: ${node.getText()}`)
}

/** The code argument of a `refused`, `refusal` or `fail` call; a call whose definition names no code is skipped. */
function call(node: ts.CallExpression, file: string, context: CodeContext, found: Found): void {
	const callee = node.expression
	if (!ts.isIdentifier(callee) || !HELPERS.has(callee.text)) return
	const index = context.argIndex(file, callee.text)
	if (index === null) return
	const argument = node.arguments[index]
	if (argument === undefined) {
		found.hidden.add(`${file}: ${node.getText()}`)
		return
	}
	record(valueCodes(argument, context), argument.getText(), file, found)
}

/** One node of a source, for what it states. */
function visit(node: ts.Node, file: string, context: CodeContext, found: Found): void {
	if (ts.isPropertyAssignment(node)) property(node, file, context, found)
	else if (ts.isShorthandPropertyAssignment(node)) shorthand(node, file, found)
	else if (ts.isPropertySignature(node)) member(node, file, context, found)
	if (ts.isCallExpression(node)) call(node, file, context, found)
}

/** Every source's codes, and the ones it hides, unless the file and the exact text are allowed. */
export function scan(sources: readonly Source[], allowed: ReadonlySet<string>): Scan {
	const parsed = sources.map(parseSource)
	const context = contextOf(parsed)
	const found: Found = { codes: [], hidden: new Set() }
	for (const source of parsed) {
		for (const tree of source.trees) {
			walk(tree, (node) => visit(node, source.file, context, found))
		}
	}
	return { codes: found.codes, hidden: [...found.hidden].filter((key) => !allowed.has(key)) }
}

/** Every named code of every source, so a constant a file imports still reads as the code it holds. */
export function allConstants(sources: readonly Source[]): Map<string, string> {
	return new Map(contextOf(sources.map(parseSource)).constants)
}
