// Every route is prerendered as a static shell, with no server-side rendering of data. The shell is
// the same for each route; the Snapshot is read in the browser. `trailingSlash` makes each route a
// `<route>/index.html`, which any static file server serves without a fallback rule.
export const prerender = true
export const ssr = false
export const trailingSlash = "always"
