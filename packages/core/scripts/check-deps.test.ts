import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
	collectSources,
	findViolations,
	internalPackageOf,
	isTestFile,
	type SourceFile,
	specifiersOf,
} from "./check-deps";

const file = (path: string, source: string): SourceFile => ({ path, source });
const violationsOf = (...files: SourceFile[]) =>
	findViolations(files).map((v) => `${v.file} -> ${v.specifier}`);

describe("internalPackageOf", () => {
	test("names the package for the root and subpath specifiers", () => {
		expect(internalPackageOf("@trajectonomics/tax/th")).toBe("tax");
		expect(internalPackageOf("@trajectonomics/sim")).toBe("sim");
	});

	test("ignores look-alike and external packages", () => {
		expect(internalPackageOf("@trajectonomics/moneyx")).toBeUndefined();
		expect(internalPackageOf("@trajectonomics/core/sim")).toBeUndefined();
		expect(internalPackageOf("zod")).toBeUndefined();
	});
});

describe("specifiersOf", () => {
	test("finds static, re-export, type-only, dynamic and require imports", () => {
		const source = [
			'import { a } from "@trajectonomics/money"',
			'export * from "@trajectonomics/ledger"',
			'import type { B } from "@trajectonomics/sim"',
			'const t = await import("@trajectonomics/tax")',
			'const r = require("@trajectonomics/tax/th")',
		].join("\n");
		expect(specifiersOf("tax/src/x.ts", source)).toEqual(
			expect.arrayContaining([
				"@trajectonomics/money",
				"@trajectonomics/ledger",
				"@trajectonomics/sim",
				"@trajectonomics/tax",
				"@trajectonomics/tax/th",
			]),
		);
	});

	test("does not see a specifier that only appears in a comment", () => {
		const source =
			'// import { x } from "@trajectonomics/sim"\nexport const y = 1\n';
		expect(specifiersOf("money/src/x.ts", source)).toEqual([]);
	});
});

describe("isTestFile", () => {
	test("accepts *.test.ts and anything under src/th/tests", () => {
		expect(isTestFile("tax/src/us/agi.test.ts")).toBe(true);
		expect(isTestFile("tax/src/th/tests/levy-sim.ts")).toBe(true);
		expect(isTestFile("tax/src/th/levy/emit.ts")).toBe(false);
	});
});

describe("findViolations", () => {
	test("money and sim may not import any internal package", () => {
		const money = file("money/src/a.ts", 'import "@trajectonomics/ledger"');
		const sim = file(
			"sim/src/b.test.ts",
			'import { x } from "@trajectonomics/money"',
		);
		expect(violationsOf(money, sim)).toEqual([
			"money/src/a.ts -> @trajectonomics/ledger",
			"sim/src/b.test.ts -> @trajectonomics/money",
		]);
	});

	test("ledger may import money and nothing else internal", () => {
		const ok = file(
			"ledger/src/money.ts",
			'import { toMinorUnits } from "@trajectonomics/money"',
		);
		const bad = file(
			"ledger/src/x.ts",
			'import { calc } from "@trajectonomics/tax/th"',
		);
		const sim = file(
			"ledger/src/index.test.ts",
			'import "@trajectonomics/sim"',
		);
		expect(violationsOf(ok, bad, sim)).toEqual([
			"ledger/src/x.ts -> @trajectonomics/tax/th",
			"ledger/src/index.test.ts -> @trajectonomics/sim",
		]);
	});

	test("tax may import money freely", () => {
		const ok = file(
			"tax/src/us/calculate.ts",
			'import { usd } from "@trajectonomics/money"',
		);
		expect(violationsOf(ok)).toEqual([]);
	});

	test("tax may import sim from test files only", () => {
		const testFile = file(
			"tax/src/th/tests/levy-sim.ts",
			'import { check } from "@trajectonomics/sim"',
		);
		const unitTest = file(
			"tax/src/th/levy/emit.test.ts",
			'import { check } from "@trajectonomics/sim"',
		);
		const production = file(
			"tax/src/th/levy/emit.ts",
			'import type { Levy } from "@trajectonomics/sim"',
		);
		expect(violationsOf(testFile, unitTest)).toEqual([]);
		expect(violationsOf(production)).toEqual([
			"tax/src/th/levy/emit.ts -> @trajectonomics/sim",
		]);
	});

	test("tax may not import ledger", () => {
		const bad = file("tax/src/us/x.ts", 'import "@trajectonomics/ledger"');
		expect(violationsOf(bad)).toEqual([
			"tax/src/us/x.ts -> @trajectonomics/ledger",
		]);
	});

	test("the real core tree has no violations", async () => {
		const coreDir = resolve(import.meta.dir, "..");
		const files = await collectSources(coreDir);
		expect(files.length).toBeGreaterThan(0);
		expect(findViolations(files)).toEqual([]);
	});
});
