import { type Failure, failure } from "./failures"
import { isArticle, jsonLdTypes } from "./html"

/** The llms.txt the blog serves for answer engines, at the host root. */
export const LLMS_FILE = "llms.txt"

/** A Post page states a BlogPosting, so an answer engine reads its headline, date and author. */
export function checkPostStructuredData(path: string, html: string): Failure[] {
	if (!isArticle(html) || jsonLdTypes(html).includes("BlogPosting")) return []
	return [failure("post-structured-data-missing", path, "is a Post but states no BlogPosting")]
}

/** The build carries the llms.txt index, so an answer engine finds the Posts without crawling. */
export function checkLlmsFile(built: ReadonlySet<string>): Failure[] {
	if (built.has(LLMS_FILE)) return []
	return [failure("llms-txt-missing", LLMS_FILE, "is missing, so answer engines have no index")]
}
