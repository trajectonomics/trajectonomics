import { describe, expect, it } from "bun:test"
import { DEVELOPMENT_VERSION, telemetryDecision } from "./decide"

const RELEASE = "0.5.0"
const on = { enabled: true }
const off = { enabled: false }

describe("telemetryDecision", () => {
	it("counts a release build with nothing set", () => {
		expect(telemetryDecision({ env: {}, state: on, version: RELEASE })).toEqual({
			enabled: true,
			reason: "on",
		})
	})

	it("treats an empty, 0 or false DO_NOT_TRACK as unset, and anything else as set", () => {
		for (const value of ["", "0", "false"]) {
			expect(
				telemetryDecision({ env: { DO_NOT_TRACK: value }, state: on, version: RELEASE }).reason,
			).toBe("on")
		}
		for (const value of ["1", "yes", "true"]) {
			expect(
				telemetryDecision({ env: { DO_NOT_TRACK: value }, state: on, version: RELEASE }),
			).toEqual({ enabled: false, reason: "do_not_track" })
		}
	})

	it("turns counting off for TRAJ_TELEMETRY set to 0, off or false in any case", () => {
		for (const value of ["0", "off", "false", "OFF", "False"]) {
			expect(
				telemetryDecision({ env: { TRAJ_TELEMETRY: value }, state: on, version: RELEASE }),
			).toEqual({ enabled: false, reason: "env_off" })
		}
		expect(
			telemetryDecision({ env: { TRAJ_TELEMETRY: "1" }, state: on, version: RELEASE }).reason,
		).toBe("on")
	})

	it("never counts on a CI runner, with the same falsy spellings as DO_NOT_TRACK", () => {
		expect(telemetryDecision({ env: { CI: "true" }, state: on, version: RELEASE })).toEqual({
			enabled: false,
			reason: "ci",
		})
		expect(telemetryDecision({ env: { CI: "0" }, state: on, version: RELEASE }).reason).toBe("on")
	})

	it("respects a state file that says off", () => {
		expect(telemetryDecision({ env: {}, state: off, version: RELEASE })).toEqual({
			enabled: false,
			reason: "turned_off",
		})
	})

	it("never counts a development build, whatever the other facts say", () => {
		expect(DEVELOPMENT_VERSION).toBe("0.0.0")
		expect(telemetryDecision({ env: {}, state: on, version: "0.0.0" })).toEqual({
			enabled: false,
			reason: "development_build",
		})
	})

	it("reports the first cause in precedence order", () => {
		const everything = { DO_NOT_TRACK: "1", TRAJ_TELEMETRY: "0", CI: "1" }
		expect(telemetryDecision({ env: everything, state: off, version: "0.0.0" }).reason).toBe(
			"do_not_track",
		)
		expect(
			telemetryDecision({ env: { TRAJ_TELEMETRY: "0", CI: "1" }, state: off, version: "0.0.0" })
				.reason,
		).toBe("env_off")
		expect(telemetryDecision({ env: { CI: "1" }, state: off, version: "0.0.0" }).reason).toBe("ci")
		expect(telemetryDecision({ env: {}, state: off, version: "0.0.0" }).reason).toBe("turned_off")
	})
})
