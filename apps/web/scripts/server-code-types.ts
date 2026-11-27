/**
 * The codes one type of a Dashboard source states: each member of a union, a string literal type, and a named alias
 * followed to the union it names, kept from cycling. A type that states no code (`string`, `number`, a flag) reads as
 * none; one the scan cannot read is unreadable, never silently skipped. Pure: the test passes the context in.
 */
import ts from "typescript"
import type { CodeContext } from "./server-code-context"
import { NONE, UNREAD, type Value } from "./server-code-value"

/** The type keywords that state no code. */
const WORDS: ReadonlySet<ts.SyntaxKind> = new Set([
	ts.SyntaxKind.StringKeyword,
	ts.SyntaxKind.NumberKeyword,
	ts.SyntaxKind.BooleanKeyword,
	ts.SyntaxKind.AnyKeyword,
	ts.SyntaxKind.UnknownKeyword,
	ts.SyntaxKind.NeverKeyword,
	ts.SyntaxKind.VoidKeyword,
	ts.SyntaxKind.UndefinedKeyword,
	ts.SyntaxKind.ObjectKeyword,
	ts.SyntaxKind.SymbolKeyword,
	ts.SyntaxKind.BigIntKeyword,
])

/** A union's members or one literal type's codes, or unreadable for a shape that states none the scan can read. */
function literalOrUnion(node: ts.TypeNode, context: CodeContext, seen: ReadonlySet<string>): Value {
	if (ts.isUnionTypeNode(node)) return unionCodes(node.types, context, seen)
	if (!ts.isLiteralTypeNode(node)) return UNREAD
	const literal = node.literal
	if (ts.isStringLiteral(literal)) return { codes: [literal.text], read: true }
	const plain =
		literal.kind === ts.SyntaxKind.NullKeyword ||
		literal.kind === ts.SyntaxKind.TrueKeyword ||
		literal.kind === ts.SyntaxKind.FalseKeyword ||
		ts.isNumericLiteral(literal)
	return plain ? NONE : UNREAD
}

/** Each member's codes, readable only when every member is. */
function unionCodes(
	types: readonly ts.TypeNode[],
	context: CodeContext,
	seen: ReadonlySet<string>,
): Value {
	const values = types.map((type) => typeCodes(type, context, seen))
	return {
		codes: values.flatMap((value) => value.codes),
		read: values.every((value) => value.read),
	}
}

/** A named alias's codes; an unknown name, a keyword or a cycle states none it can read. */
function aliasCodes(name: string, context: CodeContext, seen: ReadonlySet<string>): Value {
	const alias = context.aliases.get(name)
	if (alias === undefined) return UNREAD
	if (seen.has(name)) return NONE
	return typeCodes(alias, context, new Set([...seen, name]))
}

/** The codes a type states, and whether the scan could read it. */
export function typeCodes(
	node: ts.TypeNode,
	context: CodeContext,
	seen: ReadonlySet<string> = new Set(),
): Value {
	if (ts.isParenthesizedTypeNode(node)) return typeCodes(node.type, context, seen)
	if (ts.isLiteralTypeNode(node) || ts.isUnionTypeNode(node))
		return literalOrUnion(node, context, seen)
	if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
		return aliasCodes(node.typeName.text, context, seen)
	}
	return WORDS.has(node.kind) ? NONE : UNREAD
}
