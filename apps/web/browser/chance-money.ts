import type { Page } from "@playwright/test"
import { type DemoSnapshot, INFLATION_BPS, TODAY } from "./chance-money-snapshot"

/** The snapshot the checks serve: real Bands, a stated swing, and one future read in advance. */
function patched(snapshot: DemoSnapshot): DemoSnapshot {
	const chance = snapshot.reads.chance.base
	const projection = snapshot.reads.projections.base.data
	const annual = projection.tables.find((table) => table.name === "annual")?.rows ?? []
	const document = snapshot.reads.documents.base.data.scenario.document
	return {
		...snapshot,
		reads: {
			...snapshot.reads,
			chance: {
				base: {
					...snapshot.reads.chance.base,
					data: {
						...chance.data,
						realBands: chance.data.bands.map((band) => ({
							...band,
							netWorth: band.netWorth.map((percentile) => ({ ...percentile, value: TODAY })),
						})),
					},
				},
			},
			documents: {
				base: {
					...snapshot.reads.documents.base,
					data: {
						scenario: {
							...snapshot.reads.documents.base.data.scenario,
							document: {
								...document,
								economy: { ...document.economy, inflation: 300, inflationVolatility: 150 },
							},
						},
					},
				},
			},
			paths: {
				base: {
					"0": {
						argv: ["projection", "path", "--scenario=base", "--index=0", "--json"],
						ok: true,
						data: {
							...projection,
							index: 0,
							definition: chance.data.definition,
							returns: annual.map((row) => ({
								index: row.index,
								from: row.from,
								to: row.to,
								inflationBps: INFLATION_BPS,
								accounts: [{ account: "demo-fund", returnBps: 500 }],
							})),
						},
					},
				},
			},
		},
	}
}

/** Serves the patched Demo snapshot to this test's page. */
export async function serveBands(page: Page): Promise<void> {
	await page.route("**/demo/snapshot.json", async (route) => {
		const response = await route.fetch()
		const snapshot = (await response.json()) as DemoSnapshot
		await route.fulfill({ response, json: patched(snapshot) })
	})
}
