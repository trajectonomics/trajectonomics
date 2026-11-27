import { describe, expect, it } from "bun:test"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { shareBpsOf, shareText } from "./projection/chance-share"
import {
	captureChance,
	GOLDENS,
	goldenText,
	milestonedHome,
	milestoneFlags,
} from "./projection-chance-milestones-support"
import { chanceBody, modelFile } from "./projection-chance-support"

describe("projection chance --milestone-dates", () => {
	it("matches the committed golden, byte for byte", async () => {
		const home = await milestonedHome()
		const res = await captureChance(home, milestoneFlags(modelFile(home)))
		expect(res.code).toBe(0)
		const text = goldenText(res)
		await recordGoldenTextIn(GOLDENS, "chance-milestones.output", text)
		expect(await goldenTextIn(GOLDENS, "chance-milestones.output")).toBe(text)
	})

	it("matches the committed human golden, byte for byte", async () => {
		const home = await milestonedHome()
		const res = await captureChance(home, milestoneFlags(modelFile(home)), false)
		expect(res.code).toBe(0)
		await recordGoldenTextIn(GOLDENS, "chance-milestones-human.output", res.out)
		expect(await goldenTextIn(GOLDENS, "chance-milestones-human.output")).toBe(res.out)
	})

	it("matches the committed golden with --outcomes too, each path's fired dates by id", async () => {
		const home = await milestonedHome()
		const res = await captureChance(home, [...milestoneFlags(modelFile(home)), "--outcomes"])
		expect(res.code).toBe(0)
		const text = goldenText(res)
		await recordGoldenTextIn(GOLDENS, "chance-milestones-outcomes.output", text)
		expect(await goldenTextIn(GOLDENS, "chance-milestones-outcomes.output")).toBe(text)
	})

	it("keeps Scenario order and states each reached share in the success share's format", async () => {
		const home = await milestonedHome()
		const body = chanceBody(await captureChance(home, milestoneFlags(modelFile(home))))
		expect(body.milestones?.map((entry) => entry.id)).toEqual(["stop", "retire", "rich", "never"])
		for (const milestone of body.milestones ?? []) {
			expect(milestone.reached.share).toBe(
				shareText(shareBpsOf(milestone.reached.paths, body.paths)),
			)
		}
		expect(body.milestones?.[0]?.displayLabel).toBe("stop work")
	})

	it("states each Percentile date with the household's ages, and null dates when none reached it", async () => {
		const home = await milestonedHome()
		const body = chanceBody(await captureChance(home, milestoneFlags(modelFile(home))))
		const stop = body.milestones?.[0]
		expect(stop?.dates?.p50?.date).toBe("2026-09-01")
		expect(stop?.dates?.p50?.ages).toEqual([{ person: "me", age: 36 }])
		const never = body.milestones?.at(-1)
		expect(never).toMatchObject({ id: "never", reached: { paths: 0 }, dates: null, byYear: [] })
	})

	it("omits a person who is not in the plan on the fire date", async () => {
		const home = await milestonedHome()
		const body = chanceBody(await captureChance(home, milestoneFlags(modelFile(home))))
		const retire = body.milestones?.find((entry) => entry.id === "retire")
		expect(retire?.dates?.p50?.date).toBe("2027-06-01")
		expect(retire?.dates?.p50?.ages.map((entry) => entry.person)).toEqual(["me"])
		const rich = body.milestones?.find((entry) => entry.id === "rich")
		expect(rich?.dates?.p50?.ages.map((entry) => entry.person)).toEqual(["me", "partner"])
	})
})
