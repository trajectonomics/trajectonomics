import { describe, expect, test } from "bun:test"
import { routeRequest } from "../src/core/route"
import { INTERNAL_HOST, LEGACY_HOST } from "../src/core/urls"

const DELETE_PATH = "/internal/contributors/delete"

function at(hostname: string, pathname: string, method = "GET") {
	return routeRequest({ hostname, pathname, search: "", method })
}

describe("routeRequest on the internal host", () => {
	test("answers the deletion path on POST only", () => {
		expect(at(INTERNAL_HOST, DELETE_PATH, "POST")).toEqual({ kind: "delete_contributor" })
		expect(at(INTERNAL_HOST, DELETE_PATH)).toEqual({
			kind: "method_not_allowed",
			allow: "POST",
		})
		expect(at(INTERNAL_HOST, DELETE_PATH, "PUT")).toEqual({
			kind: "method_not_allowed",
			allow: "POST",
		})
	})

	test("answers every other path with not_found", () => {
		expect(at(INTERNAL_HOST, "/internal")).toEqual({ kind: "not_found" })
		expect(at(INTERNAL_HOST, "/internal/contributors")).toEqual({ kind: "not_found" })
		expect(at(INTERNAL_HOST, "/data/ingest", "POST")).toEqual({ kind: "not_found" })
	})
})

describe("the internal path on every other host", () => {
	test("is not_found, never a redirect", () => {
		expect(at(LEGACY_HOST, DELETE_PATH, "POST")).toEqual({ kind: "not_found" })
		expect(at(LEGACY_HOST, `/data${DELETE_PATH}`, "POST")).toEqual({ kind: "not_found" })
		expect(at("trajectonomics.com", DELETE_PATH, "POST")).toEqual({ kind: "not_found" })
		expect(at("trajectonomics.com", `/data${DELETE_PATH}`, "POST")).toEqual({
			kind: "not_found",
		})
	})
})
