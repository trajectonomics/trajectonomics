#!/usr/bin/env bun
// Packs the built pages in dist/ into pack/dashboard.bin, the one file `traj dashboard` embeds.
import { mkdir, readdir } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import { encodePack } from "./pack-format"

const DIST = "dist"
const OUT = "pack/dashboard.bin"

/** Every file under a directory, by its path from that directory as "/a/b.html". */
async function filesUnder(root: string): Promise<[string, Uint8Array][]> {
	const entries = await readdir(root, { recursive: true, withFileTypes: true })
	const files = entries.filter((entry) => entry.isFile())
	return Promise.all(
		files.map(async (entry): Promise<[string, Uint8Array]> => {
			const path = join(entry.parentPath, entry.name)
			const key = `/${relative(root, path).split(sep).join("/")}`
			return [key, await Bun.file(path).bytes()]
		}),
	)
}

/** Writes the Pack. Returns the exit code: 1 when there is no build to pack. */
export async function main(): Promise<number> {
	const files = await filesUnder(DIST).catch(() => [])
	if (!files.some(([key]) => key === "/index.html")) {
		process.stderr.write(`There is no build in ${DIST}/ to pack: run vite build first.\n`)
		return 1
	}
	await mkdir("pack", { recursive: true })
	await Bun.write(OUT, encodePack(files))
	process.stdout.write(`Packed ${files.length} files into ${OUT}.\n`)
	return 0
}

if (import.meta.main) {
	process.exit(await main())
}
