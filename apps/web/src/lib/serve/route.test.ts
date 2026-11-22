import { describe, expect, test } from "bun:test"
import { assetKeys, contentTypeOf, isLoopbackHost } from "./route"

describe("assetKeys", () => {
	test("the root and a route with a slash answer with their index.html", () => {
		expect(assetKeys("/")).toEqual(["/index.html"])
		expect(assetKeys("/net-worth/")).toEqual(["/net-worth/index.html"])
	})

	test("a path without a slash tries the file, then the route's index.html", () => {
		expect(assetKeys("/net-worth")).toEqual(["/net-worth", "/net-worth/index.html"])
		expect(assetKeys("/_app/version.json")).toEqual([
			"/_app/version.json",
			"/_app/version.json/index.html",
		])
	})

	test("a path that climbs out of the build answers nothing", () => {
		expect(assetKeys("/../traj.db")).toEqual([])
		expect(assetKeys("/a/../../b")).toEqual([])
		expect(assetKeys("relative")).toEqual([])
	})
})

describe("contentTypeOf", () => {
	test("names the type of each kind of built file", () => {
		expect(contentTypeOf("/index.html")).toBe("text/html; charset=utf-8")
		expect(contentTypeOf("/_app/immutable/entry/app.JS")).toBe("text/javascript; charset=utf-8")
		expect(contentTypeOf("/demo/snapshot.json")).toBe("application/json; charset=utf-8")
		expect(contentTypeOf("/favicon.svg")).toBe("image/svg+xml")
	})

	test("an unknown or missing extension is plain bytes", () => {
		expect(contentTypeOf("/file.xyz")).toBe("application/octet-stream")
		expect(contentTypeOf("/LICENSE")).toBe("application/octet-stream")
	})
})

describe("isLoopbackHost", () => {
	test("accepts this machine's names on the server's port", () => {
		expect(isLoopbackHost("127.0.0.1:4321", 4321)).toBe(true)
		expect(isLoopbackHost("LOCALHOST:4321", 4321)).toBe(true)
		expect(isLoopbackHost("[::1]:4321", 4321)).toBe(true)
	})

	test("refuses another port, another name and a missing header", () => {
		expect(isLoopbackHost("127.0.0.1:80", 4321)).toBe(false)
		expect(isLoopbackHost("evil.example:4321", 4321)).toBe(false)
		expect(isLoopbackHost("127.0.0.1", 4321)).toBe(false)
		expect(isLoopbackHost(null, 4321)).toBe(false)
	})
})
