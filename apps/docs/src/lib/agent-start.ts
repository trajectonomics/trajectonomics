import { twinUrl } from "./agent/twin-url"
import { DOCS_BASE_PATH, DOCS_INDEX_PATH, OPERATOR_TAB_CONTENT } from "./tabs"

/** The Operator tab page that carries the skill and install commands the prompt sends an Agent to. */
export const INSTALLATION_PAGE_PATH = `${DOCS_BASE_PATH}/${OPERATOR_TAB_CONTENT}/installation/`

/** The heading of the Landing Page section that hands the Docs Portal to an Agent. */
export const AGENT_START_HEADING = "Start with your Agent"

/** The line under that heading: what the reader does with the prompt. */
export const AGENT_START_LEAD =
	"Paste this into Claude Code, Codex, Cursor or any Agent that can read a URL and run a command. It reads the docs, installs the setup skill and asks you about your goal before it runs anything."

/** The heading of the Landing Page section on the ways an Agent reads the Portal on its own. */
export const AGENT_ROUTES_HEADING = "Every page reads as Markdown"

/** The copy control's label before it copies, after it copies, and when the browser refuses. */
export const COPY_PROMPT_LABEL = "Copy prompt"
export const COPIED_LABEL = "Copied"
export const COPY_FAILED_LABEL = "Copy failed"

/** The prompt a reader hands their Agent, with every URL absolute so it works pasted anywhere. */
export function agentPrompt(origin: string): string {
	return [
		"Set me up with Trajectonomics: `traj`, a command line for my ledger, projections and Thai tax.",
		"",
		`1. Read ${origin}${DOCS_INDEX_PATH}. It lists every docs page with its Markdown URL.`,
		`2. Read ${twinUrl(origin, INSTALLATION_PAGE_PATH)} and follow "Add the agent skill" to install the setup skill.`,
		"3. Follow the setup skill. Ask me about my situation and goal before you run anything.",
		"",
		"Every number you tell me comes from `traj`, never from your own arithmetic.",
	].join("\n")
}

/** One way an Agent reads the Docs Portal without a reader: what it is, and the line to copy. */
export interface AgentRoute {
	readonly title: string
	readonly description: string
	readonly snippet: string
}

/** The three ways an Agent reads the Docs Portal, in the order it should try them. */
export function agentRoutes(origin: string): readonly [AgentRoute, AgentRoute, AgentRoute] {
	return [
		{
			title: "The Docs index",
			description: "Every page once, in Tab order, with its description and Markdown URL.",
			snippet: `${origin}${DOCS_INDEX_PATH}`,
		},
		{
			title: "Any page as Markdown",
			description: "Put .md in place of a page's trailing slash. The Landing Page is /index.md.",
			snippet: twinUrl(origin, INSTALLATION_PAGE_PATH),
		},
		{
			title: "Ask for Markdown",
			description: "Send Accept: text/markdown to any page URL and get its Markdown twin back.",
			snippet: `curl -H "Accept: text/markdown" ${origin}${INSTALLATION_PAGE_PATH}`,
		},
	]
}
