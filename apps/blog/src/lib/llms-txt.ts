import { DOCS_URL, SITE_HOME_URL, SOURCE_URL } from "./site"

/** The title llms.txt opens with: the blog's name, as the llmstxt.org shape names it. */
export const LLMS_TITLE = "Trajectonomics Blog"

/** One English Post as the file lists it: its title, its canonical URL and its one-line description. */
export interface LlmsPost {
	readonly title: string
	readonly url: string
	readonly description: string
}

/** The inputs of the file: the one-line summary the front page states, and the Posts to list. */
export interface LlmsInput {
	readonly summary: string
	readonly posts: readonly LlmsPost[]
}

/** The places outside the blog the file links, in the order it lists them. */
const ELSEWHERE: readonly { readonly label: string; readonly url: string }[] = Object.freeze([
	{ label: "Site", url: SITE_HOME_URL },
	{ label: "Docs", url: DOCS_URL },
	{ label: "GitHub", url: SOURCE_URL },
])

/** One Post as a list item: its title linked to its canonical URL, then its description. */
function postLine(post: LlmsPost): string {
	return `- [${post.title}](${post.url}): ${post.description}`
}

/**
 * The blog's llms.txt in the llmstxt.org shape: a title, a one-line summary, the English Posts, then
 * the places the blog links. Data in, text out: the caller reads the Posts and the summary.
 */
export function llmsTxt(input: LlmsInput): string {
	return [
		`# ${LLMS_TITLE}`,
		"",
		`> ${input.summary}`,
		"",
		"## Posts",
		"",
		...(input.posts.length === 0 ? [] : [...input.posts.map(postLine), ""]),
		"## Elsewhere",
		"",
		...ELSEWHERE.map((link) => `- [${link.label}](${link.url})`),
		"",
	].join("\n")
}
