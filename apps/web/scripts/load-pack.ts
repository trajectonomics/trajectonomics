/// <reference path="./pack-module.d.ts" />
import type { ErrorBody } from "../src/lib/contract"
import { decodePack, type Pack } from "./pack-format"

const NO_PAGES: ErrorBody = {
	code: "internal",
	exitCode: 1,
	message: "This build of traj carries no Dashboard pages.",
	hint: "Build apps/web (bun run build) before you build or run traj from a checkout.",
}

const DAMAGED_PAGES: ErrorBody = {
	code: "internal",
	exitCode: 1,
	message: "This build of traj carries damaged Dashboard pages.",
	hint: "Rebuild apps/web (bun run build), then traj.",
}

/** The packed pages this build carries, or why it has none: built without them, or damaged. */
export async function loadPack(): Promise<
	{ ok: true; pack: Pack } | { ok: false; error: ErrorBody }
> {
	let path: string
	try {
		path = (await import("../pack/dashboard.bin", { with: { type: "file" } })).default
	} catch {
		return { ok: false, error: NO_PAGES }
	}
	const pack = decodePack(await Bun.file(path).text())
	return pack === null ? { ok: false, error: DAMAGED_PAGES } : { ok: true, pack }
}
