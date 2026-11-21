import { describe, expect, it } from "bun:test"
import { featureSamples } from "./feature-samples"

describe("featureSamples", () => {
	it("gives one sample per wide card: traj fi, then traj schema", () => {
		const samples = featureSamples("1.2.3")
		expect(samples.map((sample) => sample.command.split(" ").slice(0, 2).join(" "))).toEqual([
			"traj fi",
			"traj schema",
		])
	})

	it("states the engine version it is given, so the sample follows the release", () => {
		const [fi] = featureSamples("1.2.3")
		expect(fi?.output).toContain('"version": "1.2.3"')
	})
})
