import { describe, expect, test } from "bun:test"
import { machineAlias } from "../src/machine"

describe("machineAlias", () => {
	test("hashes the hostname into an m- label", () => {
		// SHA-256("synthetic-host") starts with 39746613.
		expect(machineAlias("synthetic-host")).toBe("m-39746613")
	})

	test("never contains the raw hostname", () => {
		const alias = machineAlias("synthetic-host")
		expect(alias.startsWith("m-")).toBe(true)
		expect(alias).not.toContain("synthetic")
		expect(alias).toHaveLength(10)
	})
})
