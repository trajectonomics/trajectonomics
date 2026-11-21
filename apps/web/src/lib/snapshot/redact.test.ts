import { describe, expect, test } from "bun:test"
import { redactDirectory } from "./redact"

describe("redacting the scratch directory", () => {
	test("replaces every occurrence of the directory with the stand-in", () => {
		const text = '{"path":"/scratch/home","database":"/scratch/home/traj.db"}'
		expect(redactDirectory(text, "/scratch/home", "~/.traj")).toBe(
			'{"path":"~/.traj","database":"~/.traj/traj.db"}',
		)
	})

	test("an empty directory leaves the text as it is", () => {
		expect(redactDirectory("unchanged", "", "~/.traj")).toBe("unchanged")
	})
})
