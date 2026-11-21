/** One rule the built blog breaks; each rule has its own code. */
export type FailureCode =
	| "file-outside-base"
	| "preload-path-served"
	| "security-policy-set"
	| "not-found-page-missing"
	| "page-title-missing"
	| "page-canonical-missing"
	| "shell-home-link-missing"
	| "shell-blog-link-missing"
	| "shell-footer-missing"

/** A broken rule, the built file that breaks it, and a sentence a reader can act on. */
export interface Failure {
	readonly code: FailureCode
	readonly path: string
	readonly message: string
}

/** A file in the build output: its path under `dist/`, and its text when it is a page or headers file. */
export interface BuiltFile {
	readonly path: string
	readonly text?: string
}

/** A frozen failure. */
export function failure(code: FailureCode, path: string, message: string): Failure {
	return Object.freeze({ code, path, message })
}
