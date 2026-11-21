import { type ContentFile, navigationEntries, resolvesNavigationEntry } from "./content-pages"
import type { ContentStructureProblem, ContentStructureRule } from "./content-structure"
import { TABS } from "./tabs"

/** The problems a required file is absent, or none. */
function missing(
	files: readonly ContentFile[],
	path: string,
	rule: ContentStructureRule,
): readonly ContentStructureProblem[] {
	return files.some((file) => file.path === path) ? [] : [{ rule, detail: `${path} is missing` }]
}

/** The problems `entry` is absent from a folder's navigation, or none. */
function unlisted(
	files: readonly ContentFile[],
	folder: string,
	entry: string,
	rule: "tab-listed",
): readonly ContentStructureProblem[] {
	if (navigationEntries(files, folder).includes(entry)) {
		return []
	}
	const owner = folder === "" ? "the content root" : folder
	return [{ rule, detail: `${owner}/meta.json does not list ${entry}` }]
}

/** The folder a content path lives in, `""` for the content root. */
function parentOf(path: string): string {
	const cut = path.lastIndexOf("/")
	return cut === -1 ? "" : path.slice(0, cut)
}

function tabProblems(files: readonly ContentFile[]): readonly ContentStructureProblem[] {
	return TABS.flatMap((tab) => [
		...missing(files, `${tab.folder}/index.mdx`, "tab-landing-page"),
		...missing(files, `${tab.folder}/meta.json`, "tab-navigation"),
		...unlisted(files, "", tab.folder, "tab-listed"),
	])
}

function navigationProblems(files: readonly ContentFile[]): readonly ContentStructureProblem[] {
	return files
		.filter((file) => file.path.endsWith("meta.json"))
		.flatMap((file) => {
			const folder = parentOf(file.path)
			return navigationEntries(files, folder)
				.filter((entry) => !resolvesNavigationEntry(files, folder, entry))
				.map((entry) => ({
					rule: "navigation-entry" as const,
					detail: `${file.path} lists ${entry}, which has no page`,
				}))
		})
}

/** Every navigation rule the content tree breaks: Tabs and page entries. */
export function navigationStructureProblems(
	files: readonly ContentFile[],
): readonly ContentStructureProblem[] {
	return [...tabProblems(files), ...navigationProblems(files)]
}
