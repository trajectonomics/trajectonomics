import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { ThAssumptionFact } from "../assumptions/facts"
import { TH_UNCONFIRMED_FIGURES } from "../assumptions/unconfirmed"
import { parameterValue } from "../assumptions/value"
import { TH_2026_PARAMETERS } from "../parameters"
import { parseThSourceManifest } from "../references/manifest"
import { collectParameterPaths } from "../references/paths"

const MANIFEST = join(import.meta.dir, "../../../references/th/SOURCES.md")
const manifest = parseThSourceManifest(await Bun.file(MANIFEST).text())

const FIX = "Update TH_UNCONFIRMED_FIGURES in src/th/assumptions to match references/th/SOURCES.md."

describe("TH_UNCONFIRMED_FIGURES against references/th/SOURCES.md", () => {
	it("names exactly the rows whose result is reported or unsourced, with their status", () => {
		const fromManifest = manifest.rows
			.filter((row) => row.result === "reported" || row.result === "unsourced")
			.map((row) => `${row.result} ${row.path}`)
			.sort()
		const fromRecord = TH_UNCONFIRMED_FIGURES.map((entry) => `${entry.status} ${entry.path}`).sort()
		expect({ message: FIX, entries: fromRecord }).toEqual({ message: FIX, entries: fromManifest })
	})

	it("names each figure once and only parameter paths that hold a number", () => {
		const paths = TH_UNCONFIRMED_FIGURES.map((entry) => entry.path)
		expect(new Set(paths).size).toBe(paths.length)
		const known = collectParameterPaths(TH_2026_PARAMETERS)
		for (const path of paths) {
			expect(known).toContain(path)
			expect(parameterValue(path)).toBeDefined()
		}
	})

	it("gives every figure a note and at least one fact that makes a computation use it", () => {
		const facts: readonly string[] = Object.values(ThAssumptionFact)
		for (const entry of TH_UNCONFIRMED_FIGURES) {
			expect(entry.note.length).toBeGreaterThan(0)
			expect(entry.usedBy.length).toBeGreaterThan(0)
			for (const fact of entry.usedBy) expect(facts).toContain(fact)
		}
	})

	it("is used: every fact is claimed by some figure, so none is dead vocabulary", () => {
		const used = new Set(TH_UNCONFIRMED_FIGURES.flatMap((entry) => entry.usedBy))
		const unused = Object.values(ThAssumptionFact).filter((fact) => !used.has(fact))
		expect(unused).toEqual([])
	})
})

describe("parameterValue", () => {
	it("reads a scalar, a nested scalar and a table column", () => {
		expect(parameterValue("finalWithholding.digitalAssetRate")).toBe(0.15)
		expect(parameterValue("allowances.retirementCluster.gpf.ceiling")).toBe(500_000)
		expect(parameterValue("realEstate.expenseTable[*].minYears")).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
	})

	it("refuses a path that is not a number", () => {
		expect(() => parameterValue("allowances.child")).toThrow(TypeError)
		expect(() => parameterValue("realEstate.expenseTable[*]")).toThrow(TypeError)
	})
})
