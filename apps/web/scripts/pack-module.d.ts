// `import("…/dashboard.bin", { with: { type: "file" } })` gives the file's path: on disk from a
// checkout, inside the binary once `bun build --compile` has embedded it.
declare module "*.bin" {
	const path: string
	export default path
}
