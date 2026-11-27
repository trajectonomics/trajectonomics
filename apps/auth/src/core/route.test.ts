import { describe, expect, it } from "bun:test"
import { AUTH_BASE_PATH, authHandlerPath, JWKS_PATH } from "./route"

describe("authHandlerPath", () => {
	it("serves the public JWKS alias from Better Auth's handler", () => {
		expect(authHandlerPath(JWKS_PATH)).toBe(`${AUTH_BASE_PATH}/jwks`)
	})

	it("leaves every Better Auth path alone", () => {
		expect(authHandlerPath("/api/auth/sign-in/email")).toBe("/api/auth/sign-in/email")
		expect(authHandlerPath("/api/auth/oauth2/token")).toBe("/api/auth/oauth2/token")
		expect(authHandlerPath("/api/auth/jwks")).toBe("/api/auth/jwks")
	})

	it("does not rewrite a path that only ends in jwks", () => {
		expect(authHandlerPath("/jwks/extra")).toBe("/jwks/extra")
		expect(authHandlerPath("/other/jwks")).toBe("/other/jwks")
	})
})
