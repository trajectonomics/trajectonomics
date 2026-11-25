import type { ProjectionChance } from "../../contract"

/** A chance read over three roll-ups, with the Percentiles rising by the same step each year. */
export function chanceFixture(overrides: Partial<ProjectionChance> = {}): ProjectionChance {
	const bands = [0, 1, 2].map((index) => ({
		index,
		to: `${2026 + index}-12-31`,
		netWorth: [10, 25, 50, 75, 90].map((level) => ({
			level,
			value: `${(level * 1000 + index * 100).toFixed(2)}`,
		})),
	}))
	return {
		asOf: "2026-10-31",
		engine: { package: "@trajectonomics/core", version: "0.8.0" },
		scenario: {
			id: "id-base",
			name: "base",
			contentHash: "jcs1:sha256:aaa",
			effectiveContentHash: "jcs1:sha256:aaa",
		},
		overrides: [],
		removals: [],
		tax: "applied",
		notes: ["Every figure is nominal."],
		horizon: "2028-12-31",
		currency: "THB",
		definition: {
			modelId: "illustrative-demo-model",
			seed: "0123456789abcdef",
			paths: 200,
			modelHash: "jcs1:sha256:0000000000000000000000000000000000000000000000000000000000000000",
		},
		paths: 200,
		succeeded: 174,
		successBps: 8700,
		bands,
		runsOut: [
			{ index: 0, to: "2026-12-31", paths: 0 },
			{ index: 1, to: "2027-12-31", paths: 12 },
			{ index: 2, to: "2028-12-31", paths: 14 },
		],
		tables: [],
		...overrides,
	}
}
