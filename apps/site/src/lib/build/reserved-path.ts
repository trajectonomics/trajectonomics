import { BLOG_PATH, DATA_PATH, DOCS_PATH } from "../site"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** A path the Site is not the server of, so the Site must never build a file there. */
const RESERVED_PRELOAD_PATH = "__mf-preload.js"

/**
 * The mount points zone routes give other Workers on the Site's host: the Docs Portal, the blog and
 * the data site. A file the Site built under one would shadow that Worker in a local run and mislead
 * the build, so the build fails instead.
 */
const RESERVED_MOUNT_PATHS: readonly string[] = Object.freeze([DOCS_PATH, BLOG_PATH, DATA_PATH])

/** The directory a mount path names, without its leading and trailing slashes. */
function mountDirectory(mount: string): string {
	return mount.replace(/^\/|\/$/g, "")
}

/** Every built file under one mount: the directory itself or a file inside it. */
function builtUnder(files: readonly BuiltFile[], mount: string): readonly BuiltFile[] {
	const directory = mountDirectory(mount)
	return files.filter((file) => file.path === directory || file.path.startsWith(`${directory}/`))
}

/** The Reserved preload path stays unbuilt: no Worker serves it, so the Site must not claim it. */
function checkReservedPreloadPath(files: readonly BuiltFile[]): readonly BuildFailure[] {
	if (fileAt(files, RESERVED_PRELOAD_PATH) === undefined) return []
	return [
		buildFailure(
			"RESERVED_PRELOAD_PATH_BUILT",
			RESERVED_PRELOAD_PATH,
			"the Reserved preload path is not the Site's and must not be built here.",
		),
	]
}

/** No built file sits under a mount another Worker's zone route owns. */
function checkReservedMountPaths(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return RESERVED_MOUNT_PATHS.flatMap((mount) =>
		builtUnder(files, mount).map((file) =>
			buildFailure(
				"RESERVED_MOUNT_PATH_BUILT",
				file.path,
				`is built under ${mount}, which a zone route mounts on another Worker.`,
			),
		),
	)
}

/** Every Reserved path stays unbuilt: the preload path, and the mounts other Workers serve. */
export function checkReservedPaths(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return [...checkReservedPreloadPath(files), ...checkReservedMountPaths(files)]
}
