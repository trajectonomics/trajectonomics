import { describe, expect, it } from "bun:test"
import { ENGLISH } from "../language/en"
import { THAI } from "../language/th"
import { checkDictionaryParity, type NamedDictionary } from "./dictionary-parity"

function th(dictionary: unknown): NamedDictionary {
	return { language: "th", dictionary }
}

function en(dictionary: unknown): NamedDictionary {
	return { language: "en", dictionary }
}

function differences(left: unknown, right: unknown): readonly { code: string; path: string }[] {
	return checkDictionaryParity(th(left), en(right)).map((failure) => ({
		code: failure.code,
		path: failure.path,
	}))
}

describe("the parity of two Language dictionaries", () => {
	it("passes the same paths with the same kinds, though their values differ", () => {
		expect(differences({ a: "x", b: 1 }, { a: "y", b: 2 })).toEqual([])
	})

	it("fails a key one Language has not, naming the Language that lacks it", () => {
		const failures = checkDictionaryParity(th({ a: "x", b: "y" }), en({ a: "x" }))
		expect(failures.map((failure) => ({ code: failure.code, path: failure.path }))).toEqual([
			{ code: "DICTIONARY_KEY_MISSING", path: "b" },
		])
		expect(failures[0]?.message).toContain("en")
	})

	it("fails a key the other Language has, naming the Language that lacks it", () => {
		const failures = checkDictionaryParity(th({ a: "x" }), en({ a: "x", b: "y" }))
		expect(failures.map((failure) => ({ code: failure.code, path: failure.path }))).toEqual([
			{ code: "DICTIONARY_KEY_MISSING", path: "b" },
		])
		expect(failures[0]?.message).toContain("th")
	})

	it("fails a nested key only one side has", () => {
		expect(differences({ footer: { note: "" } }, { footer: {} })).toEqual([
			{ code: "DICTIONARY_KEY_MISSING", path: "footer.note" },
		])
	})

	it("fails an array index only one side has", () => {
		expect(differences({ items: ["a"] }, { items: ["a", "b"] })).toEqual([
			{ code: "DICTIONARY_KEY_MISSING", path: "items.1" },
		])
	})

	it("fails a path whose value kind differs, so a string cannot hide under an object", () => {
		expect(differences({ a: "x" }, { a: { b: 1 } })).toEqual([
			{ code: "DICTIONARY_SHAPE", path: "a" },
		])
	})

	it("counts an empty string and null as present values", () => {
		expect(differences({ a: "", b: null }, { a: "", b: null })).toEqual([])
	})

	it("names every path that differs, not only the first", () => {
		expect(differences({ a: "x", b: "y" }, {})).toEqual([
			{ code: "DICTIONARY_KEY_MISSING", path: "a" },
			{ code: "DICTIONARY_KEY_MISSING", path: "b" },
		])
	})

	it("passes the Site's two source Dictionaries", () => {
		expect(
			checkDictionaryParity(
				{ language: THAI.language, dictionary: THAI.dictionary },
				{ language: ENGLISH.language, dictionary: ENGLISH.dictionary },
			),
		).toEqual([])
	})
})
