import * as fs from "node:fs"
import { errorCode } from "../message"
import type { CredentialDeps } from "./credentials"

/** The real filesystem; every write is owner-only, durable and atomic. */
export const FILE_DEPS: CredentialDeps = {
	lstat: (path) => {
		const stat = fs.lstatSync(path)
		return { isFile: stat.isFile(), isSymbolicLink: stat.isSymbolicLink(), mode: stat.mode }
	},
	readText: (path) => fs.readFileSync(path, "utf8"),
	mkdirPrivate: (path) => {
		fs.mkdirSync(path, { recursive: true, mode: 0o700 })
		fs.chmodSync(path, 0o700)
	},
	writeExclusive: (path, text, mode) => {
		const fd = fs.openSync(path, "wx", mode)
		try {
			fs.writeFileSync(fd, text)
			fs.fsyncSync(fd)
		} finally {
			fs.closeSync(fd)
		}
	},
	rename: (from, to) => fs.renameSync(from, to),
	syncDir: (path) => {
		let fd: number | undefined
		try {
			fd = fs.openSync(path, "r")
			fs.fsyncSync(fd)
		} catch (error) {
			const code = errorCode(error)
			if (code !== "EISDIR" && code !== "EINVAL") throw error
		} finally {
			if (fd !== undefined) fs.closeSync(fd)
		}
	},
	remove: (path) => fs.rmSync(path, { force: true }),
}
