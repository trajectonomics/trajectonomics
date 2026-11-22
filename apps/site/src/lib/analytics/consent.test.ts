import { describe, expect, it } from "bun:test"
import {
	CONSENT_MAX_AGE_SECONDS,
	consentChoiceFrom,
	consentCookies,
	consentFromRequest,
	isVisitorId,
	visitorCookie,
	visitorIdFrom,
} from "./consent"

const ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"

function signals(
	overrides: Partial<{ cookieHeader: string | null; secGpc: string | null; dnt: string | null }>,
) {
	return { cookieHeader: null, secGpc: null, dnt: null, ...overrides }
}

describe("the consent state a request states", () => {
	it("is undecided when the visitor has not answered", () => {
		expect(consentFromRequest(signals({}))).toEqual({ kind: "undecided" })
		expect(consentFromRequest(signals({ cookieHeader: "traj_lang=th" }))).toEqual({
			kind: "undecided",
		})
	})

	it("is granted with the visitor id when the id is valid", () => {
		expect(
			consentFromRequest(signals({ cookieHeader: `traj_consent=granted; traj_vid=${ID}` })),
		).toEqual({ kind: "granted", visitorId: ID })
	})

	it("is granted without an id when the request carries none", () => {
		expect(consentFromRequest(signals({ cookieHeader: "traj_consent=granted" }))).toEqual({
			kind: "granted",
			visitorId: undefined,
		})
	})

	it("drops an id that is not a strict lowercase UUID", () => {
		for (const bad of ["><script>", ID.toUpperCase(), `${ID}x`, "not-a-uuid", ""]) {
			expect(
				consentFromRequest(signals({ cookieHeader: `traj_consent=granted; traj_vid=${bad}` })),
			).toEqual({ kind: "granted", visitorId: undefined })
		}
	})

	it("is denied when the cookie says so", () => {
		expect(consentFromRequest(signals({ cookieHeader: "traj_consent=denied" }))).toEqual({
			kind: "denied",
		})
	})

	it("treats an unknown stored answer as undecided", () => {
		expect(consentFromRequest(signals({ cookieHeader: "traj_consent=maybe" }))).toEqual({
			kind: "undecided",
		})
	})

	it("is denied when Sec-GPC or DNT asks for no tracking, whatever is stored", () => {
		expect(
			consentFromRequest(signals({ secGpc: "1", cookieHeader: "traj_consent=granted" })),
		).toEqual({ kind: "denied" })
		expect(consentFromRequest(signals({ dnt: "1" }))).toEqual({ kind: "denied" })
	})

	it("ignores a Sec-GPC or DNT header that is not 1", () => {
		expect(consentFromRequest(signals({ secGpc: "0", dnt: "0" }))).toEqual({ kind: "undecided" })
	})
})

describe("the visitor id", () => {
	it("accepts exactly a strict lowercase UUID", () => {
		expect(isVisitorId(ID)).toBe(true)
		expect(isVisitorId(undefined)).toBe(false)
		expect(isVisitorId('"><script>')).toBe(false)
	})

	it("reads the id a cookie header carries among other cookies", () => {
		expect(visitorIdFrom(`a=1; traj_vid=${ID}; b=2`)).toBe(ID)
		expect(visitorIdFrom(null)).toBeUndefined()
	})
})

describe("the consent cookies a choice writes", () => {
	it("stores a grant and the id, for the same six months as the answer", () => {
		expect(consentCookies("granted", ID)).toEqual([
			`traj_consent=granted; Path=/; Secure; SameSite=Lax; Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
			`traj_vid=${ID}; Path=/; Secure; SameSite=Lax; Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
		])
	})

	it("stores a refusal and clears the id", () => {
		expect(consentCookies("denied", ID)).toEqual([
			`traj_consent=denied; Path=/; Secure; SameSite=Lax; Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
			"traj_vid=; Path=/; Secure; SameSite=Lax; Max-Age=0",
		])
	})

	it("clears both cookies on a reset", () => {
		expect(consentCookies("reset", ID)).toEqual([
			"traj_consent=; Path=/; Secure; SameSite=Lax; Max-Age=0",
			"traj_vid=; Path=/; Secure; SameSite=Lax; Max-Age=0",
		])
	})

	it("never marks the id HttpOnly, because the Docs Portal reads it", () => {
		expect(visitorCookie(ID)).not.toContain("HttpOnly")
	})
})

describe("the choice a consent parameter names", () => {
	it("names granted, denied and reset", () => {
		expect(consentChoiceFrom("granted")).toBe("granted")
		expect(consentChoiceFrom("denied")).toBe("denied")
		expect(consentChoiceFrom("reset")).toBe("reset")
	})

	it("names nothing else", () => {
		expect(consentChoiceFrom(null)).toBeUndefined()
		expect(consentChoiceFrom("")).toBeUndefined()
		expect(consentChoiceFrom("GRANTED")).toBeUndefined()
		expect(consentChoiceFrom('"><script>')).toBeUndefined()
	})
})
