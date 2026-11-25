// `typescript` 7 is the native compiler and has no in-memory parser, so parse with the classic
// compiler that the app packages already use (`typescript-classic` in package.json).
import * as ts from "typescript-classic"

/** A tracked file as the guard reads it. */
export interface SourceFile {
	readonly path: string
	readonly text: string
}

const SOURCE = /\.(?:[cm]?[jt]s|tsx)$/
const SKIPPED = /(?:^|\/)(?:node_modules|dist|\.astro|\.agents|\.claude|\.vibe|\.grok)\//
const MAKES = ["mkdtemp", "mkdtempSync"] as const
const REMOVES = ["rm", "rmSync"] as const

/**
 * The escape hatch: files whose temporary directory a helper elsewhere removes, so no `rm` or
 * `rmSync` appears in the file itself. Each entry pairs the path with the removal it relies on, so
 * an allow-listed file says why it is exempt rather than only that it is (#544).
 */
export const ALLOWED: ReadonlyMap<string, string> = new Map<string, string>([])

/**
 * Whether the guard reads this tracked path: source code outside build output and vendored skills.
 * A Svelte component is out of scope, because the guard reads JS and TS files and not Svelte
 * templates; a `.svelte.ts` module is an ordinary TS file and is read.
 */
export function isChecked(path: string): boolean {
	return SOURCE.test(path) && !SKIPPED.test(path)
}

/** The parser's view of an extension, so TypeScript and JSX parse as the toolchain reads them. */
function scriptKind(path: string): ts.ScriptKind {
	if (path.endsWith(".tsx")) return ts.ScriptKind.TSX
	if (path.endsWith(".jsx")) return ts.ScriptKind.JSX
	if (/\.(?:[cm]?js)$/.test(path)) return ts.ScriptKind.JS
	return ts.ScriptKind.TS
}

/** The name a call goes through when it is a bare identifier or a property access, such as `fs.rm`. */
function calleeName(expression: ts.Expression): string | undefined {
	if (ts.isIdentifier(expression)) return expression.text
	if (ts.isPropertyAccessExpression(expression)) return expression.name.text
	return undefined
}

/**
 * The names every call in the file goes through, taken from its syntax tree. Comments, string
 * contents, template text and regex literals cannot produce a call, so an `rm` in prose or in a path
 * is not a removal, and a quote in a regex literal cannot open a fake string (#609).
 */
function calledNames(file: SourceFile): ReadonlySet<string> {
	const source = ts.createSourceFile(
		file.path,
		file.text,
		ts.ScriptTarget.Latest,
		true,
		scriptKind(file.path),
	)
	const names = new Set<string>()
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			const name = calleeName(node.expression)
			if (name !== undefined) names.add(name)
		}
		ts.forEachChild(node, visit)
	}
	visit(source)
	return names
}

/**
 * The files that make a temporary directory with `mkdtemp` or `mkdtempSync` and never call `rm` or
 * `rmSync`, so a run leaves the directory behind (#544). A file named in `allowed` is exempt, and
 * only a call in code counts: one in a line comment, a block comment, a string, a template or a regex
 * does not. Svelte components are not checked, as `isChecked` reads only JS and TS files.
 */
export function unremovedTempDirs(
	files: readonly SourceFile[],
	allowed: ReadonlyMap<string, string> = ALLOWED,
): string[] {
	return files
		.filter((file) => {
			const called = calledNames(file)
			const makes = MAKES.some((name) => called.has(name))
			const removes = REMOVES.some((name) => called.has(name))
			return makes && !removes
		})
		.map((file) => file.path)
		.filter((path) => !allowed.has(path))
}
