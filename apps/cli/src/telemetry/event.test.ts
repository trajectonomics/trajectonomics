import { describe, expect, it } from "bun:test"
import { EVENT_NAME, NOTICE, POSTHOG_PROJECT_KEY, POSTHOG_URL, usageEvent } from "./event"

const base = {
	id: "0194b000-0000-7000-8000-00000000000a",
	version: "0.5.0",
	platform: "linux",
	arch: "x64",
	timestamp: "2026-11-22T10:00:00.000Z",
	uuid: "0194b000-0000-7000-8000-00000000000b",
}

describe("usageEvent", () => {
	it("is a PostHog capture body for the one event, with the project key", () => {
		const event = usageEvent({
			...base,
			record: { command: "tx add", exitCode: 0, format: "human" },
		})
		expect(event).toEqual({
			api_key: POSTHOG_PROJECT_KEY,
			event: EVENT_NAME,
			distinct_id: base.id,
			timestamp: base.timestamp,
			uuid: base.uuid,
			properties: {
				command: "tx add",
				exit_code: 0,
				format: "human",
				version: "0.5.0",
				os: "linux",
				arch: "x64",
				surface: "cli",
				$process_person_profile: false,
			},
		})
		expect(EVENT_NAME).toBe("traj_command_run")
		expect(POSTHOG_URL).toBe("https://eu.i.posthog.com/i/v0/e/")
	})

	it("states exactly the property keys it may send, so nothing is added silently", () => {
		const full = usageEvent({
			...base,
			record: { command: "tx add", exitCode: 2, errorCode: "invalid_input", format: "json" },
		})
		expect(Object.keys(full.properties).sort()).toEqual(
			[
				"$process_person_profile",
				"arch",
				"command",
				"error_code",
				"exit_code",
				"format",
				"os",
				"surface",
				"version",
			].sort(),
		)
	})

	it("omits command and error_code when the run has none to report", () => {
		const bare = usageEvent({
			...base,
			record: { exitCode: 2, format: "human" },
		})
		expect(Object.keys(bare.properties).sort()).toEqual(
			["$process_person_profile", "arch", "exit_code", "format", "os", "surface", "version"].sort(),
		)
	})

	it("sends the leaf path and the error code, never anything typed after them", () => {
		const event = usageEvent({
			...base,
			record: { command: "account add", exitCode: 0, format: "human" },
		})
		const serialized = JSON.stringify(event)
		for (const secret of ["Cash", "/home/", "~/.traj", "THB", "1234.56"]) {
			expect(serialized).not.toContain(secret)
		}
	})

	it("carries the notice text as one plain ASCII sentence pair", () => {
		expect(NOTICE).toMatch(/^traj counts anonymous usage/)
		expect(NOTICE).toContain('"traj telemetry off" or DO_NOT_TRACK=1')
		expect(NOTICE).toContain(
			"https://github.com/trajectonomics/trajectonomics/tree/main/apps/cli#telemetry",
		)
		expect(/^[\x20-\x7e]+$/.test(NOTICE)).toBe(true)
	})
})
