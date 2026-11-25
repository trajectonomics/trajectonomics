import type { BuiltFile } from "./built-files"
import { DEMO_PREFIX, demoPages } from "./demo"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
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
	{ tag: "source", attribute: "src" },
	{ tag: "video", attribute: "src" },
	{ tag: "audio", attribute: "src" },
	{ tag: "iframe", attribute: "src" },
	{ tag: "form", attribute: "action" },
] as const

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
		return page.elements.flatMap((element) => {
			const attribute = LINKED_ATTRIBUTES.find(
				(link) => link.tag === element.tag && element.attributes[link.attribute] !== undefined,
			)
			if (attribute === undefined) return []
			const value = element.attributes[attribute.attribute] ?? ""
			if (!leavesDemo(pagePath, value)) return []
			return [
				buildFailure(
					"DEMO_LINK_OUTSIDE",
					pagePath,
					`<${element.tag} ${attribute.attribute}="${value}"> leaves /demo/.`,
				),
			]
		})
	})
}
