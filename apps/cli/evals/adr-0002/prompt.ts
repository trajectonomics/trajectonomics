import type { Persona } from "./persona"

/**
 * The prompt every agent gets for a persona. It carries the conversation and the three questions,
 * never the oracle's answers, and it forbids reading the repository so the agent works from `traj`.
 */
export function promptFor(persona: Persona): string {
	const questions = [
		"When can I stop working? Use the plan as I described it.",
		"What is my 2026 income tax, in baht?",
		`If ${persona.whatIf.description}, when can I stop working? Change only that, and keep the rest of the plan.`,
	]
	return [
		"You are helping one person plan their money. Your only tool is the `traj` command line, which is on your PATH.",
		"",
		"Rules:",
		"- Use `traj` for every number. Do not estimate, and do not do any tax or financial independence arithmetic yourself.",
		"- Start with `traj help` and `traj schema`. `traj help <command>` describes one command and its flags.",
		"- Do not read, search or open any file on this computer, and do not look for source code, a repository or documentation. Work from the conversation below and from what `traj` tells you.",
		"- Do not write any file outside your working directory, and do not keep scratch files in /tmp or anywhere else. Keep any notes in your working directory only.",
		`- The plan starts on ${persona.asOf} and is projected to ${persona.horizon}.`,
		"",
		"The conversation:",
		"<<<",
		persona.conversation,
		">>>",
		"",
		"Answer these three questions, in order:",
		...questions.map((question, index) => `${index + 1}. ${question}`),
		"",
		"When you are finished, end your reply with exactly one fenced json block and nothing after it:",
		"```json",
		'{"fiDate": "YYYY-MM-DD or null", "tax2026Baht": 0, "whatIfFiDate": "YYYY-MM-DD or null"}',
		"```",
		"Use the first day of the month in which financial independence is reached, and null when the plan does not reach it by the horizon.",
	].join("\n")
}
