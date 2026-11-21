import { describe, expect, test } from "bun:test"
import { codeFences } from "./content-programs"

describe("the fenced code blocks a Docs Portal page publishes", () => {
	test("a block reports the language on its info string and the text between its fences", () => {
		expect(codeFences("# page\n\n```json\n{}\n```\n")).toEqual([{ language: "json", body: "{}" }])
	})

	test("the language is read without the options that follow it", () => {
		expect(codeFences('```ts title="example"\nconst a = 1\n```\n')).toEqual([
			{ language: "ts", body: "const a = 1" },
		])
	})

	test("every block of a page is reported in source order", () => {
		const content = "```json\n{}\n```\n\ntext\n\n```ts\nconst a = 1\n```\n"
		expect(codeFences(content).map((fence) => fence.language)).toEqual(["json", "ts"])
	})
})
