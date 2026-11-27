import { TABS, type TabDefinition, tabUrl } from "../tabs"
import type { BuiltFile } from "./built-files"
import { fileAt, portalAsset } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import type { HtmlAnchor } from "./html"
import { anchors, elementContent } from "./html"

/** Assets-root path of a Tab's built index page. */
function tabPageFile(tab: TabDefinition): string {
	return portalAsset(`${tab.folder}/index.html`)
}

function missingFailures(file: BuiltFile, links: readonly HtmlAnchor[]): readonly BuildFailure[] {
	return TABS.filter((tab) => !links.some((link) => link.href === tabUrl(tab))).map((tab) =>
		buildFailure("HEADER_TAB_LINK_MISSING", file.path, `#nd-subnav has no link to ${tabUrl(tab)}`),
	)
}

function currentFailures(
	file: BuiltFile,
	tab: TabDefinition,
	links: readonly HtmlAnchor[],
): readonly BuildFailure[] {
	return links.flatMap((link) => {
		const isCurrent = link.href === tabUrl(tab)
		const marked = link.ariaCurrent === "page"
		if (isCurrent && !marked) {
			return [
				buildFailure(
					"HEADER_TAB_NOT_CURRENT",
					file.path,
					`#nd-subnav gives ${link.href} no aria-current="page" on the ${tab.title} page`,
				),
			]
		}
		if (!isCurrent && marked) {
			return [
				buildFailure(
					"HEADER_TAB_OTHER_CURRENT",
					file.path,
					`#nd-subnav marks ${link.href} aria-current="page" on the ${tab.title} page`,
				),
			]
		}
		return []
	})
}

function headerFailures(file: BuiltFile, tab: TabDefinition): readonly BuildFailure[] {
	const links = anchors(elementContent(file.content, "nd-subnav") ?? "").filter((link) =>
		TABS.some((candidate) => tabUrl(candidate) === link.href),
	)
	return [...missingFailures(file, links), ...currentFailures(file, tab, links)]
}

/** The Landing Page's home-layout header, which carries the Tabs with neither marked current. */
const LANDING_PAGE_FILE = portalAsset("index.html")

function landingHeaderFailures(file: BuiltFile): readonly BuildFailure[] {
	const links = anchors(elementContent(file.content, "nd-nav") ?? "").filter((link) =>
		TABS.some((candidate) => tabUrl(candidate) === link.href),
	)
	const marked = links.flatMap((link) =>
		link.ariaCurrent === "page"
			? [
					buildFailure(
						"HEADER_TAB_OTHER_CURRENT",
						file.path,
						`#nd-nav marks ${link.href} aria-current="page" on the Landing Page`,
					),
				]
			: [],
	)
	return [...missingFailures(file, links), ...marked]
}

/** Failures for Tab links a built Tab page's header lacks, or marks as current on the wrong page. */
export function checkHeaderTabs(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const landing = fileAt(files, LANDING_PAGE_FILE)
	return [
		...TABS.flatMap((tab) => {
			const file = fileAt(files, tabPageFile(tab))
			return file === undefined ? [] : headerFailures(file, tab)
		}),
		...(landing === undefined ? [] : landingHeaderFailures(landing)),
	]
}
