import { TEST_USER } from "./config"
import { json, type Session } from "./http"

/**
 * Signs the test user up and answers the marketing question once, as a person does on the
 * welcome page. Without an answer every authorization goes through `/welcome` first, so the spike's
 * flows would never reach the code redirect they check.
 */
export async function signUp(session: Session): Promise<Record<string, unknown>> {
	const user = await session.json<Record<string, unknown>>(
		"/api/auth/sign-up/email",
		json(TEST_USER),
	)
	await session.json(
		"/api/auth/marketing-consent",
		json({ optedIn: false, source: "first-sign-in", language: "en" }),
	)
	return user
}
