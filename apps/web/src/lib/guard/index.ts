/** The Svelte 5 guard: pure rules over one component's source, and the dependency check. No I/O. */
export { checkComponent, MAX_COMPONENT_LINES } from "./check"
export { forbiddenDependencies, type PackageManifest } from "./dependencies"
export type { GuardIssue } from "./line-rule"
