import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { LLMS_FILE, LLMS_TXT } from "../src/lib/crawl/llms"
import { LLMS_FULL_FILE, LLMS_FULL_TXT } from "../src/lib/crawl/llms-full"

/** Both Answer engine files, as the script writes them: the built name and its text. */
const FILES: readonly (readonly [string, string])[] = [
	[LLMS_FILE, LLMS_TXT],
	[LLMS_FULL_FILE, LLMS_FULL_TXT],
]

/** Writes the Answer engine files into the Site's static directory, and returns the bytes written. */
export async function writeLlmsFiles(destination: string): Promise<number> {
	await mkdir(destination, { recursive: true })
	let bytes = 0
	for (const [name, content] of FILES) {
		const path = join(destination, name)
		await writeFile(path, content)
		const written = Bun.file(path)
		if (!(await written.exists()) || written.size !== Buffer.byteLength(content)) {
			throw new Error(`llms-txt: ${path} was not written in full.`)
		}
		bytes += written.size
	}
	return bytes
}

if (import.meta.main) {
	const destination = fileURLToPath(new URL("../public", import.meta.url))
	const bytes = await writeLlmsFiles(destination)
	console.log(`llms-txt: ${bytes} bytes for ${FILES.length} files in ${destination}`)
}
