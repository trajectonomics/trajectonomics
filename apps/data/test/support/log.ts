import { spyOn } from "bun:test"

/** Silences the Worker's expected error logs in a test and returns the restore function. */
export function silenceConsoleError(): () => void {
	const spy = spyOn(console, "error").mockImplementation(() => {})
	return () => spy.mockRestore()
}
