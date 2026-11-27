import { describe, expect, it } from "bun:test"
import { signInRetryPath } from "./sign-in-retry"

describe("where a failed social sign-in returns", () => {
	it("is the same page, marked as failed", () => {
		expect(signInRetryPath("/sign-in/", "")).toBe("/sign-in/?error=1")
		expect(signInRetryPath("/th/sign-in/", "")).toBe("/th/sign-in/?error=1")
	})

	it("keeps ?next=", () => {
		const next = "/device/?user_code=ABCD-EFGH"
		const path = signInRetryPath("/sign-in/", `?next=${encodeURIComponent(next)}`)
		const params = new URL(path, "https://auth.invalid").searchParams
		expect(params.get("next")).toBe(next)
		expect(params.get("error")).toBe("1")
	})

	it("keeps every signed value of a provider query", () => {
		const search =
			"?client_id=traj-data-web&scope=openid+profile&sig=a%2Bb%2Fc%3D&ba_param=ba_param&ba_param=client_id&ba_param=scope"
		const path = signInRetryPath("/sign-in/", search)
		const params = new URL(path, "https://auth.invalid").searchParams
		expect([...params].filter(([name]) => name !== "error")).toEqual([
			...new URLSearchParams(search),
		])
	})

	it("does not pile up the errors of earlier attempts", () => {
		const path = signInRetryPath(
			"/sign-in/",
			"?next=%2Faccount%2F&error=1&error=access_denied&error_description=no",
		)
		expect(path).toBe("/sign-in/?next=%2Faccount%2F&error=1")
	})

	it("leaves a signed error value alone", () => {
		const path = signInRetryPath("/sign-in/", "?error=x&ba_param=error&sig=s")
		const params = new URL(path, "https://auth.invalid").searchParams
		expect(params.getAll("error")).toEqual(["x"])
	})

	it("never names another host, and carries no backslash", () => {
		expect(signInRetryPath("//evil.example/", "")).toBe("/evil.example/?error=1")
		expect(signInRetryPath("/\\evil.example/", "")).toBe("/evil.example/?error=1")
		expect(signInRetryPath("/sign-in/", "?next=\\evil")).not.toContain("\\")
	})
})
