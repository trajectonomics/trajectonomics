import { TEST_USER } from "./config"
import { json, type Session } from "./http"

export async function signUp(session: Session): Promise<Record<string, unknown>> {
	return session.json("/api/auth/sign-up/email", json(TEST_USER))
}
