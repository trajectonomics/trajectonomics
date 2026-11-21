/**
 * Import-direction check for the four packages bundled into `@trajectonomics/core`.
 *
 * Rules, applied to every `.ts` file under `{money,ledger,tax,sim}/src`:
 *   a. money and sim import no internal package.
 *   b. ledger imports only money. tax imports only money, plus sim from test files (rule c).
 *   c. tax imports sim only from test files: `*.test.ts`, or anything under `src/th/tests/`.
 *
 * Run as a script to check the tree; exits 1 and lists every violation when a rule breaks.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const INTERNAL_PACKAGES = ["money", "ledger", "tax", "sim"] as const;
export type InternalPackage = (typeof INTERNAL_PACKAGES)[number];

/** A source file, with `path` relative to `packages/core` and written with forward slashes. */
export interface SourceFile {
	readonly path: string;
	readonly source: string;
}

export interface Violation {
	readonly file: string;
	readonly specifier: string;
	readonly message: string;
}

const INTERNAL_SPECIFIER = /^@trajectonomics\/(money|ledger|tax|sim)(?=\/|$)/;

/** The internal package a specifier names, or `undefined` for anything else. */
export function internalPackageOf(
	specifier: string,
): InternalPackage | undefined {
	const match = INTERNAL_SPECIFIER.exec(specifier);
	return match?.[1] as InternalPackage | undefined;
}

/** Every module specifier in a file: static, re-export, dynamic `import()` and `require()`. */
export function specifiersOf(path: string, source: string): string[] {
	const loader = path.endsWith(".tsx") ? "tsx" : "ts";
	const transpiler = new Bun.Transpiler({ loader });
	const specifiers = transpiler
		.scanImports(source)
		.map((record) => record.path);
	// `scanImports` drops `import type` records, and a type-only import is still a dependency.
	for (const match of source.matchAll(
		/\bimport\s+type\s+[^'"`;]*?\bfrom\s*["']([^"']+)["']/g,
	)) {
		specifiers.push(match[1] ?? "");
	}
	return specifiers;
}

/** True for test files: `*.test.ts`, and anything under `src/th/tests/`. */
export function isTestFile(path: string): boolean {
	return path.endsWith(".test.ts") || path.includes("/src/th/tests/");
}

/** The package that owns a file, from its path such as `tax/src/th/index.ts`. */
function ownerOf(path: string): InternalPackage | undefined {
	const owner = path.split("/")[0];
	return INTERNAL_PACKAGES.find((name) => name === owner);
}

/** Checks every file against the four rules and returns the violations, in input order. */
export function findViolations(files: readonly SourceFile[]): Violation[] {
	const violations: Violation[] = [];
	for (const file of files) {
		const owner = ownerOf(file.path);
		if (owner === undefined) continue;
		for (const specifier of specifiersOf(file.path, file.source)) {
			const target = internalPackageOf(specifier);
			if (target === undefined || target === owner) continue;
			const message = violationMessage(owner, target, file.path);
			if (message !== undefined)
				violations.push({ file: file.path, specifier, message });
		}
	}
	return violations;
}

function violationMessage(
	owner: InternalPackage,
	target: InternalPackage,
	path: string,
): string | undefined {
	if (owner === "money" || owner === "sim") {
		return `${owner} must not import any internal package (imports ${target})`;
	}
	if (owner === "ledger") {
		return target === "money"
			? undefined
			: `ledger may import only money (imports ${target})`;
	}
	// owner is tax from here on.
	if (target === "money") return undefined;
	if (target === "sim") {
		return isTestFile(path)
			? undefined
			: "tax may import sim only from test files (*.test.ts or src/th/tests/)";
	}
	return `tax may import only money, and sim from tests (imports ${target})`;
}

/** Reads every `.ts` file under `{money,ledger,tax,sim}/src` in the given core directory. */
export async function collectSources(coreDir: string): Promise<SourceFile[]> {
	const files: SourceFile[] = [];
	for (const name of INTERNAL_PACKAGES) {
		const srcDir = join(coreDir, name, "src");
		const entries = await readdir(srcDir, { recursive: true });
		for (const entry of entries.sort()) {
			if (!entry.endsWith(".ts")) continue;
			const source = await readFile(join(srcDir, entry), "utf8");
			files.push({
				path: `${name}/src/${entry.split("\\").join("/")}`,
				source,
			});
		}
	}
	return files;
}

async function main(): Promise<number> {
	const coreDir = resolve(import.meta.dir, "..");
	const violations = findViolations(await collectSources(coreDir));
	if (violations.length === 0) {
		console.log("check-deps: no forbidden imports between core's packages");
		return 0;
	}
	console.error(`check-deps: ${violations.length} forbidden import(s):`);
	for (const v of violations) {
		console.error(`  ${v.file}: "${v.specifier}" — ${v.message}`);
	}
	return 1;
}

if (import.meta.main) {
	process.exitCode = await main();
}
