/**
 * What the code scan needs from every source to read a code: const strings, const maps of strings, consts typed as a
 * code union, named type aliases, and the argument each refusal helper takes its code in. Pure.
 */
import ts from "typescript"
import { type ParsedSource, walk } from "./server-code-source"

/** The argument a refusal helper's code sits at by name, when the file has no definition of its own. */
const DEFAULT_ARG: ReadonlyMap<string, number> = new Map([
	["refused", 1],
	["refusal", 1],
	["fail", 0],
])

/** What a code can name: a const string, a const map of strings, a const's union type, and a named alias. */
export interface CodeContext {
	readonly constants: ReadonlyMap<string, string>
	readonly maps: ReadonlyMap<string, ReadonlyMap<string, string>>
	readonly constTypes: ReadonlyMap<string, ts.TypeNode>
	readonly aliases: ReadonlyMap<string, ts.TypeNode>
	/** The code argument a name takes in this file: an index, or null when its local definition takes none. */
	readonly argIndex: (file: string, name: string) => number | null
}

interface Tables {
	readonly constants: Map<string, string>
	readonly maps: Map<string, ReadonlyMap<string, string>>
	readonly constTypes: Map<string, ts.TypeNode>
	readonly aliases: Map<string, ts.TypeNode>
	readonly args: Map<string, Map<string, number | null>>
}

/** A property's name when it is an identifier or a string, else null. */
function propertyKey(name: ts.PropertyName): string | null {
	return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null
}

/** The string values an object literal states by property, or null when any property is another shape. */
function stringMap(node: ts.Expression): ReadonlyMap<string, string> | null {
	if (!ts.isObjectLiteralExpression(node)) return null
	const entries: [string, string][] = []
	for (const property of node.properties) {
		if (!ts.isPropertyAssignment(property)) continue
		const key = propertyKey(property.name)
		const value = property.initializer
		if (key === null || !ts.isStringLiteralLike(value)) return null
		entries.push([key, value.text])
	}
	return new Map(entries)
}

/** The index of the parameter a refusal helper names `code`, or null when none is. */
function codeArg(parameters: readonly ts.ParameterDeclaration[]): number | null {
	const index = parameters.findIndex(
		(parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === "code",
	)
	return index === -1 ? null : index
}

/** A variable's name and value: a const string, a const map, a const's type, or an arrow that takes a code. */
function variable(node: ts.VariableDeclaration, file: string, tables: Tables): void {
	if (!ts.isIdentifier(node.name)) return
	const name = node.name.text
	if (node.type !== undefined) tables.constTypes.set(name, node.type)
	const value = node.initializer
	if (value === undefined) return
	if (ts.isStringLiteralLike(value)) tables.constants.set(name, value.text)
	const map = stringMap(value)
	if (map !== null) tables.maps.set(name, map)
	if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
		tables.args.get(file)?.set(name, codeArg(value.parameters))
	}
}

/** Every table one tree states. */
function collect(tree: ts.SourceFile, file: string, tables: Tables): void {
	walk(tree, (node) => {
		if (ts.isVariableDeclaration(node)) variable(node, file, tables)
		else if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
			tables.args.get(file)?.set(node.name.text, codeArg(node.parameters))
		} else if (ts.isTypeAliasDeclaration(node)) tables.aliases.set(node.name.text, node.type)
	})
}

/** The context every source shares: names are unique enough to read an imported constant or alias by its name. */
export function contextOf(parsed: readonly ParsedSource[]): CodeContext {
	const tables: Tables = {
		constants: new Map(),
		maps: new Map(),
		constTypes: new Map(),
		aliases: new Map(),
		args: new Map(),
	}
	for (const source of parsed) {
		tables.args.set(source.file, new Map())
		for (const tree of source.trees) collect(tree, source.file, tables)
	}
	const argIndex = (file: string, name: string): number | null => {
		const local = tables.args.get(file)
		if (local?.has(name) === true) return local.get(name) ?? null
		return DEFAULT_ARG.get(name) ?? null
	}
	return { ...tables, argIndex }
}
