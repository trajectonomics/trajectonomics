/**
 * Every Language the blog knows. Two things use the list, and they are kept apart:
 *
 * - the Interface Language, the Language the Shell and the page's labels are read in. Each one has a
 *   Language Tree: English at the root, every other Language under its own prefix (`/th/`). Every
 *   Post has a page in every tree, so adding an Interface Language costs one Dictionary.
 * - a Post Language, a Language a Post is written in: one Translation, one Markdown file. A Post has
 *   only the Translations someone wrote, so most Posts are not in every Language.
 */
export const LANGUAGES = Object.freeze(["en", "th"] as const)

/** One Language the blog knows. */
export type Language = (typeof LANGUAGES)[number]

/** The Language of the root tree, and the Translation a page falls back to first. */
export const DEFAULT_LANGUAGE: Language = "en"

/** Whether a string names a Language the blog knows. */
export function isLanguage(value: string): value is Language {
	return (LANGUAGES as readonly string[]).includes(value)
}

/** Every Interface Language but the default: the trees that live under a prefix. */
export const PREFIXED_LANGUAGES: readonly Language[] = Object.freeze(
	LANGUAGES.filter((language) => language !== DEFAULT_LANGUAGE),
)

/** The address of a page in a Language Tree: the default tree has no prefix, the others have theirs. */
export function treePath(language: Language, path: string): string {
	if (!path.startsWith("/")) {
		throw new Error(`treePath: "${path}" is not an absolute path`)
	}
	return language === DEFAULT_LANGUAGE ? path : `/${language}${path}`
}

/** The Language Tree a built page or a path belongs to, read from its first segment. */
export function treeOf(path: string): Language {
	const first = path.replace(/^\//, "").split("/")[0] ?? ""
	return isLanguage(first) && first !== DEFAULT_LANGUAGE ? first : DEFAULT_LANGUAGE
}

/**
 * The Translation a page shows: the Interface Language when the Post is written in it, else
 * English, else the first Post Language in the blog's order. `available` must not be empty.
 */
export function chooseTranslation(
	available: readonly Language[],
	interfaceLanguage: Language,
): Language {
	if (available.includes(interfaceLanguage)) return interfaceLanguage
	if (available.includes(DEFAULT_LANGUAGE)) return DEFAULT_LANGUAGE
	const first = LANGUAGES.find((language) => available.includes(language))
	if (first === undefined) {
		throw new Error("chooseTranslation: a Post has no Translation")
	}
	return first
}

/** A list of Languages in the blog's order, each once. */
export function inBlogOrder(languages: Iterable<Language>): readonly Language[] {
	const set = new Set(languages)
	return Object.freeze(LANGUAGES.filter((language) => set.has(language)))
}

/** One value per Language, such as the address of the same page in every tree. */
export function perLanguage<T>(value: (language: Language) => T): Readonly<Record<Language, T>> {
	const entries = LANGUAGES.map((language) => [language, value(language)] as const)
	return Object.freeze(Object.fromEntries(entries) as Record<Language, T>)
}
