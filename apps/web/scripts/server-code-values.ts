/**
 * The codes one expression of a Dashboard source states: a literal through `as`, `satisfies`, parentheses or `!`, both
 * arms of a conditional, both sides of `??` and `||`, the const a name holds, or a literal key into a const map. A value
 * it cannot read is unreadable, never silently skipped. Pure: the test passes the context in.
 */
import ts from "typescript"
import type { CodeContext } from "./server-code-context"
import { typeCodes } from "./server-code-types"
import { NONE, UNREAD, type Value } from "./server-code-value"

/** Both values' codes, readable only when both are. */
function both(left: Value, right: Value): Value {
	return { codes: [...left.codes, ...right.codes], read: left.read && right.read }
}

/** A value with its wrappers taken off: `(…)`, `as`, `satisfies` and a non-null `!` state the same value. */
function unwrap(node: ts.Expression): ts.Expression {
	if (ts.isParenthesizedExpression(node)) return unwrap(node.expression)
	if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) {
		return unwrap(node.expression)
	}
	return node
}

/** The codes a const name holds: its string, or the union its type alias states; another name is unreadable. */
function nameCodes(name: string, context: CodeContext): Value {
	const code = context.constants.get(name)
	if (code !== undefined) return { codes: [code], read: true }
	const type = context.constTypes.get(name)
	if (type === undefined) return UNREAD
	const union = typeCodes(type, context)
	// A const typed `string` states no code of its own, so the value it holds is unknown.
	return union.codes.length === 0 ? UNREAD : union
}

/** A literal key into a const map of strings, such as `CODES.fresh` or `CODES["fresh"]`; else unreadable. */
function mapCodes(object: ts.Expression, key: string, context: CodeContext): Value {
	const name = ts.isIdentifier(object) ? object.text : null
	const code = name === null ? undefined : context.maps.get(name)?.get(key)
	return code === undefined ? UNREAD : { codes: [code], read: true }
}

/** A property or element access with a literal key: the const map's member, or unreadable. */
function accessCodes(
	value: ts.PropertyAccessExpression | ts.ElementAccessExpression,
	context: CodeContext,
): Value {
	const key = ts.isPropertyAccessExpression(value)
		? value.name.text
		: ts.isStringLiteral(value.argumentExpression)
			? value.argumentExpression.text
			: null
	return key === null ? UNREAD : mapCodes(value.expression, key, context)
}

/** Both sides of `??` or `||`; any other operator states no code here. */
function binaryCodes(value: ts.BinaryExpression, context: CodeContext): Value {
	const operator = value.operatorToken.kind
	if (operator !== ts.SyntaxKind.QuestionQuestionToken && operator !== ts.SyntaxKind.BarBarToken) {
		return UNREAD
	}
	return both(valueCodes(value.left, context), valueCodes(value.right, context))
}

/** The codes an expression states, and whether the scan could read it. */
export function valueCodes(node: ts.Expression, context: CodeContext): Value {
	const value = unwrap(node)
	if (ts.isStringLiteralLike(value)) return { codes: [value.text], read: true }
	if (ts.isIdentifier(value)) return nameCodes(value.text, context)
	if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
		return accessCodes(value, context)
	}
	if (ts.isConditionalExpression(value)) {
		return both(valueCodes(value.whenTrue, context), valueCodes(value.whenFalse, context))
	}
	if (ts.isBinaryExpression(value)) return binaryCodes(value, context)
	const plain = [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword]
	if (plain.includes(value.kind)) return NONE
	return UNREAD
}
