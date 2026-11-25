import type { BuiltFile } from "./built-files"
import { DEMO_HEADER_PATTERN, HEADERS_FILE } from "./demo"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { parseHeadersFile } from "./headers-file"

const CONTENT_SECURITY_POLICY = "content-security-policy"

/**
 * Whether a `_headers` file sets its policies only for the hosted Demo. The Demo may carry one; the
 * Site's own pages may not, because the router injects an inline style and script (ADR 0002).
 */
function demoOnlyPolicies(content: string): boolean {
	return parseHeadersFile(content).every(
		(block) => !block.headers.has(CONTENT_SECURITY_POLICY) || block.pattern === DEMO_HEADER_PATTERN,
	)
}

/**
 * The Site sets no policy on its own pages, in HTML or in a headers file, because the router injects
 * inline style and script. The one policy the build may carry is the hosted Demo's, scoped to
 * `/demo/*` (ADR 0031).
 */
export function checkContentSecurityPolicy(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files
		.filter((file) => file.content.toLowerCase().includes(CONTENT_SECURITY_POLICY))
		.filter((file) => !(file.path === HEADERS_FILE && demoOnlyPolicies(file.content)))
		.map((file) =>
			buildFailure(
				"CONTENT_SECURITY_POLICY_PRESENT",
				file.path,
				`the Site sets no Content-Security-Policy on its own pages; the router injects an inline style and script. Only ${DEMO_HEADER_PATTERN} may carry one.`,
			),
		)
}
