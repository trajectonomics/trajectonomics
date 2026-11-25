import type { BuiltFile } from "./built-files"
import { DEMO_PREFIX, demoPages } from "./demo"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import type { HtmlElement } from "./html"
import { scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The origin a Demo page's links are resolved against; only its pathname is judged. */
const PAGE_ORIGIN = "https://site.invalid"

/** The elements whose URL a browser follows, so a page can load or navigate to it. */
const LINKED_ATTRIBUTES = [
	{ tag: "a", attribute: "href" },
	{ tag: "link", attribute: "href" },
	{ tag: "script", attribute: "src" },
	{ tag: "img", attribute: "src" },
	{ tag: "img", attribute: "srcset" },
	{ tag: "source", attribute: "src" },
	{ tag: "source", attribute: "srcset" },
	{ tag: "video", attribute: "src" },
	{ tag: "audio", attribute: "src" },
	{ tag: "iframe", attribute: "src" },
	{ tag: "form", attribute: "action" },
	{ tag: "button", attribute: "formaction" },
	{ tag: "input", attribute: "formaction" },
	{ tag: "use", attribute: "href" },
	{ tag: "use", attribute: "xlink:href" },
] as const

/** One URL an element carries, with the attribute it was read from. */
interface LinkedUrl {
	readonly attribute: string
	readonly value: string
}

/** The URLs a `srcset` candidate list names: each candidate's URL is its first token. */
function srcsetUrls(srcset: string): readonly string[] {
	return srcset
		.split(",")
		.map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
		.filter((value) => value !== "")
}

/** The URL a `<meta http-equiv="refresh">` names, when it carries one. */
function refreshUrl(element: HtmlElement): string | undefined {
	if (element.tag !== "meta") return undefined
	if ((element.attributes["http-equiv"] ?? "").toLowerCase() !== "refresh") return undefined
	const content = element.attributes["content"] ?? ""
	return /(?:^|;)\s*url\s*=\s*(['"]?)([^'"]+)\1/i.exec(content)?.[2]
}

/** Every URL an element carries, in the order a browser would read them. */
function linkedUrls(element: HtmlElement): readonly LinkedUrl[] {
	const refresh = refreshUrl(element)
	if (refresh !== undefined) return [{ attribute: "content", value: refresh }]
	return LINKED_ATTRIBUTES.flatMap((link): readonly LinkedUrl[] => {
		if (link.tag !== element.tag) return []
		const value = element.attributes[link.attribute]
		if (value === undefined) return []
		if (link.attribute === "srcset") {
			return srcsetUrls(value).map((url) => ({ attribute: "srcset", value: url }))
		}
		return [{ attribute: link.attribute, value }]
	})
}

/** Whether a URL a Demo page carries leaves the Demo's own path. */
function leavesDemo(pagePath: string, value: string): boolean {
	const url = new URL(value, `${PAGE_ORIGIN}${pagePath}`)
	if (url.origin !== PAGE_ORIGIN) return true
	return !(url.pathname === "/demo" || url.pathname.startsWith(`/${DEMO_PREFIX}`))
}

/** Every page under `/demo/` links only under `/demo/`, so no page reaches outside the Demo. */
export function checkDemoLinks(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return demoPages(files).flatMap((file) => {
		const page = scanHtml(file.content)
		const pagePath = pageUrl(file.path)
		return page.elements.flatMap((element) =>
			linkedUrls(element).flatMap(({ attribute, value }) => {
				if (!leavesDemo(pagePath, value)) return []
				return [
					buildFailure(
						"DEMO_LINK_OUTSIDE",
						pagePath,
						`<${element.tag} ${attribute}="${value}"> leaves /demo/.`,
					),
				]
			}),
		)
	})
}
