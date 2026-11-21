import { describe, expect, it } from "bun:test"
import { languageChoiceCookie, languageFromCookie } from "./stored-choice"

describe("the Language the visitor stored", () => {
	it("reads the Language a cookie names", () => {
		expect(languageFromCookie("traj_lang=th")).toBe("th")
		expect(languageFromCookie("traj_lang=en")).toBe("en")
	})

	it("reads it among other cookies, whatever their order", () => {
		expect(languageFromCookie("a=1; traj_lang=th; b=2")).toBe("th")
		expect(languageFromCookie("traj_lang=en; a=1")).toBe("en")
	})

	it("reads no choice from a missing or empty header", () => {
		expect(languageFromCookie(null)).toBeUndefined()
		expect(languageFromCookie("")).toBeUndefined()
	})

	it("reads no choice from a cookie the request does not carry", () => {
		expect(languageFromCookie("a=1; b=2")).toBeUndefined()
	})

	it("reads no choice from a value the Site does not speak", () => {
		expect(languageFromCookie("traj_lang=zz")).toBeUndefined()
		expect(languageFromCookie("traj_lang=")).toBeUndefined()
	})

	it("reads no choice from a hostile value", () => {
		expect(languageFromCookie("traj_lang=../../etc/passwd")).toBeUndefined()
		expect(languageFromCookie("traj_lang=th; Path=/")).toBe("th")
	})

	it("writes the choice as one first-party cookie with a year on it", () => {
		expect(languageChoiceCookie("th")).toBe(
			"traj_lang=th; Path=/; Secure; SameSite=Lax; Max-Age=31536000",
		)
	})
})
