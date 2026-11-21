import { describe, expect, test } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkRedirects, REDIRECTS_FILE } from "./redirects"

function redirectsFile(content: string): BuiltFile {
	return { path: REDIRECTS_FILE, content }
}

function codesOf(content: string): readonly string[] {
	return checkRedirects([redirectsFile(content)]).map((failure) => failure.code)
}

describe("the built redirect rules", () => {
	test("a build with no redirect rules reports no failure", () => {
		expect(checkRedirects([])).toEqual([])
	})

	test("a rule whose target is the Landing Page reports no failure", () => {
		expect(codesOf("/old / 301\n")).toEqual([])
	})

	test("comments and blank lines are not rules", () => {
		expect(codesOf("# /old /cli/ 302\n\n")).toEqual([])
	})

	test("a rule that sends readers to the Operator tab is reported as REDIRECT_TO_OPERATOR_TAB", () => {
		expect(codesOf("/old /cli/ 302\n")).toEqual(["REDIRECT_TO_OPERATOR_TAB"])
	})

	test("the Operator tab without its trailing slash is the same target", () => {
		expect(codesOf("/ /cli 301\n")).toEqual(["REDIRECT_TO_OPERATOR_TAB"])
	})

	test("every rule that targets the Operator tab is reported, not only the first", () => {
		expect(codesOf("/old /cli/ 302\n/also /cli/ 302\n")).toEqual([
			"REDIRECT_TO_OPERATOR_TAB",
			"REDIRECT_TO_OPERATOR_TAB",
		])
	})

	test("a rule to the Contribute tab is not the Operator redirect", () => {
		expect(codesOf("/old /contribute/ 301\n")).toEqual([])
	})
})
