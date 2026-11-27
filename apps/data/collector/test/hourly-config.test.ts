import { describe, expect, test } from "bun:test"
import { parseHostsConfig } from "../src/hourly/config"

function host(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		name: "synthetic-local",
		ssh: null,
		bun: "/synthetic/bun",
		collectorDir: "/synthetic/collector",
		quota: true,
		skipOpenCodeBefore: null,
		...overrides,
	}
}

describe("parseHostsConfig", () => {
	test("accepts a local and a remote host and normalises the cutoff", () => {
		const config = parseHostsConfig({
			hosts: [
				host(),
				host({
					name: "synthetic-remote",
					ssh: "synthetic-remote",
					skipOpenCodeBefore: "2026-10-23T14:00:00Z",
				}),
			],
		})
		expect(config.hosts).toHaveLength(2)
		expect(config.hosts[0]?.ssh).toBeNull()
		expect(config.hosts[1]?.skipOpenCodeBefore).toBe("2026-10-23T14:00:00.000Z")
	})

	test("rejects a config without a non-empty hosts array", () => {
		expect(() => parseHostsConfig({})).toThrow("config.hosts")
		expect(() => parseHostsConfig({ hosts: [] })).toThrow("config.hosts")
		expect(() => parseHostsConfig(null)).toThrow("config must be an object")
	})

	test("rejects duplicate host names", () => {
		expect(() => parseHostsConfig({ hosts: [host(), host()] })).toThrow("duplicated")
	})

	test("rejects a name that is not a lowercase label", () => {
		expect(() => parseHostsConfig({ hosts: [host({ name: "Synthetic Host" })] })).toThrow(
			"lowercase label",
		)
	})

	test("rejects a bad ssh value", () => {
		expect(() => parseHostsConfig({ hosts: [host({ ssh: 42 })] })).toThrow(".ssh")
	})

	test("rejects a non-boolean quota flag", () => {
		expect(() => parseHostsConfig({ hosts: [host({ quota: "yes" })] })).toThrow(".quota")
	})

	test("rejects an invalid cutoff", () => {
		expect(() => parseHostsConfig({ hosts: [host({ skipOpenCodeBefore: "yesterday" })] })).toThrow(
			"skipOpenCodeBefore",
		)
	})

	test("rejects a missing path", () => {
		expect(() => parseHostsConfig({ hosts: [host({ bun: "" })] })).toThrow(".bun")
	})
})
