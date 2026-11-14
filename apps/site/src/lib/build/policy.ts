import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

const CONTENT_SECURITY_POLICY = "content-security-policy"

/** The Site sets no policy, in HTML or in a headers file, because the router injects inline style and script. */
export function checkContentSecurityPolicy(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files
		.filter((file) => file.content.toLowerCase().includes(CONTENT_SECURITY_POLICY))
		.map((file) =>
			buildFailure(
				"CONTENT_SECURITY_POLICY_PRESENT",
				file.path,
				"the Site sets no Content-Security-Policy; the router injects an inline style and script.",
			),
		)
}
