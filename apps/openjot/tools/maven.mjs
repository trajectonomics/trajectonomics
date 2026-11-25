// Maven helpers for the notices generator: coordinates, POM parsing (with the parent chain),
// a small dependency closure, and a scan of an artifact's jar/aar for license/notice files.
//
// This is not a full Maven resolver. It reads <dependencies> of compile/runtime scope, follows
// parents for properties, dependencyManagement and licenses, and keeps the highest version of each
// artifact. Over-inclusion is fine for a notices file; omission is not.

import { readZip } from "./archive.mjs";
import { download, cached } from "./fetch-cache.mjs";

const GOOGLE = "https://dl.google.com/android/maven2";
const CENTRAL = "https://repo1.maven.org/maven2";

const GOOGLE_GROUPS = /^(androidx\.|com\.android\.|com\.google\.android\.|com\.google\.mlkit|com\.google\.firebase)/;

export const coordKey = (g, a) => `${g}:${a}`;

function repoUrls(g, a, v, ext) {
  const path = `${g.replaceAll(".", "/")}/${a}/${v}/${a}-${v}.${ext}`;
  const google = `${GOOGLE}/${path}`;
  const central = `${CENTRAL}/${path}`;
  return GOOGLE_GROUPS.test(g) ? [google, central] : [central, google];
}

async function downloadFirst(urls) {
  for (const url of urls) {
    const data = await download(url);
    if (data) return { url, data };
  }
  return null;
}

// --- versions ---------------------------------------------------------------

const QUALIFIER_RANK = { alpha: 1, beta: 2, rc: 3, snapshot: 0 };

/** Compares two Maven-ish version strings; pre-releases sort before the release. */
export function compareVersions(a, b) {
  const split = (v) => v.toLowerCase().match(/\d+|[a-z]+/g) ?? [];
  const pa = split(a);
  const pb = split(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return /^\d/.test(y) ? -1 : 1;
    if (y === undefined) return /^\d/.test(x) ? 1 : -1;
    const xn = /^\d/.test(x);
    const yn = /^\d/.test(y);
    if (xn && yn) {
      if (+x !== +y) return +x < +y ? -1 : 1;
    } else if (xn !== yn) {
      return xn ? 1 : -1;
    } else if (x !== y) {
      return (QUALIFIER_RANK[x] ?? 4) < (QUALIFIER_RANK[y] ?? 4) ? -1 : (QUALIFIER_RANK[x] ?? 4) > (QUALIFIER_RANK[y] ?? 4) ? 1 : x < y ? -1 : 1;
    }
  }
  return 0;
}

// --- POM --------------------------------------------------------------------

const unxml = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const tag = (xml, name) => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? unxml(m[1]) : null;
};

const blocks = (xml, name) => [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))].map((m) => m[1]);

function stripSections(xml) {
  return xml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(build|profiles|reporting|repositories|pluginRepositories|distributionManagement)>[\s\S]*?<\/\1>/g, "");
}

/** Parses the parts of a POM that the notices need, without resolving the parent. */
function parsePom(text) {
  const xml = stripSections(text);
  const parentXml = /<parent>([\s\S]*?)<\/parent>/.exec(xml)?.[1] ?? null;
  const noParent = parentXml ? xml.replace(/<parent>[\s\S]*?<\/parent>/, "") : xml;
  const managementXml = /<dependencyManagement>([\s\S]*?)<\/dependencyManagement>/.exec(noParent)?.[1] ?? "";
  const body = noParent.replace(/<dependencyManagement>[\s\S]*?<\/dependencyManagement>/, "");
  const depsXml = /<dependencies>([\s\S]*?)<\/dependencies>/.exec(body)?.[1] ?? "";
  const dep = (b) => ({
    g: tag(b, "groupId"),
    a: tag(b, "artifactId"),
    v: tag(b, "version"),
    scope: tag(b, "scope") ?? "compile",
    optional: tag(b, "optional") === "true",
    type: tag(b, "type"),
  });
  const propsXml = /<properties>([\s\S]*?)<\/properties>/.exec(body)?.[1] ?? "";
  const properties = {};
  for (const m of propsXml.matchAll(/<([\w.\-]+)>([^<]*)<\/\1>/g)) properties[m[1]] = m[2].trim();
  const head = body.replace(/<(dependencies|licenses|developers|contributors|modules|properties|scm|organization|issueManagement|ciManagement|mailingLists)>[\s\S]*?<\/\1>/g, "");
  return {
    g: tag(head, "groupId"),
    a: tag(head, "artifactId"),
    v: tag(head, "version"),
    packaging: tag(head, "packaging") ?? "jar",
    name: tag(head, "name"),
    description: tag(head, "description"),
    url: tag(head, "url"),
    parent: parentXml ? { g: tag(parentXml, "groupId"), a: tag(parentXml, "artifactId"), v: tag(parentXml, "version") } : null,
    licenses: blocks(/<licenses>([\s\S]*?)<\/licenses>/.exec(body)?.[1] ?? "", "license").map((b) => ({ name: tag(b, "name"), url: tag(b, "url") })),
    organization: tag(/<organization>([\s\S]*?)<\/organization>/.exec(body)?.[1] ?? "", "name"),
    developers: blocks(/<developers>([\s\S]*?)<\/developers>/.exec(body)?.[1] ?? "", "developer").map((b) => tag(b, "name") ?? tag(b, "id")).filter(Boolean),
    scm: tag(/<scm>([\s\S]*?)<\/scm>/.exec(body)?.[1] ?? "", "url"),
    properties,
    managed: blocks(managementXml, "dependency").map(dep),
    deps: blocks(depsXml, "dependency").map(dep),
  };
}

async function fetchPom(cacheDir, g, a, v) {
  return cached(cacheDir, `maven-pom/${g}/${a}-${v}`, async () => {
    const found = await downloadFirst(repoUrls(g, a, v, "pom"));
    if (!found) return null;
    return parsePom(found.data.toString("utf8"));
  });
}

/** The POM of g:a:v with the parent chain merged in. Null when the artifact has no POM. */
export async function loadPom(cacheDir, g, a, v, depth = 0) {
  const pom = await fetchPom(cacheDir, g, a, v);
  if (!pom) return null;
  const merged = { ...pom, properties: { ...pom.properties }, managed: [...pom.managed] };
  if (pom.parent && depth < 6) {
    const parent = await loadPom(cacheDir, pom.parent.g, pom.parent.a, pom.parent.v, depth + 1);
    if (parent) {
      merged.properties = { ...parent.properties, ...pom.properties };
      merged.managed = [...pom.managed, ...parent.managed];
      for (const k of ["url", "organization", "scm"]) merged[k] ??= parent[k];
      if (!merged.licenses.length) merged.licenses = parent.licenses;
      if (!merged.developers.length) merged.developers = parent.developers;
    }
  }
  merged.g ??= pom.parent?.g;
  merged.v ??= pom.parent?.v;
  return merged;
}

function substitute(value, pom) {
  if (value == null) return null;
  let out = value;
  for (let i = 0; i < 5 && out.includes("${"); i++) {
    out = out.replace(/\$\{([^}]+)\}/g, (all, key) => {
      if (key === "project.version" || key === "pom.version" || key === "version") return pom.v ?? all;
      if (key === "project.groupId" || key === "pom.groupId") return pom.g ?? all;
      if (key === "project.parent.version" || key === "parent.version") return pom.parent?.v ?? all;
      return pom.properties[key] ?? all;
    });
  }
  return out.includes("${") ? null : out;
}

/** Runtime dependencies of a loaded POM as [{ g, a, v }] (versions resolved, unresolved ones dropped). */
export function runtimeDeps(pom) {
  const out = [];
  for (const d of pom.deps) {
    if (d.optional || !["compile", "runtime"].includes(d.scope)) continue;
    const g = substitute(d.g, pom);
    const a = substitute(d.a, pom);
    let v = substitute(d.v, pom);
    if (!v) {
      const managed = pom.managed.find((m) => substitute(m.g, pom) === g && substitute(m.a, pom) === a);
      v = managed ? substitute(managed.v, pom) : null;
    }
    if (!g || !a || !v) continue;
    const range = /^[\[(]([^,\])]+)/.exec(v);
    out.push({ g, a, v: range ? range[1] : v });
  }
  return out;
}

// --- artifact binaries ---------------------------------------------------------

const NOTICE_NAME = /(licen[sc]e|notice|copying|third[-_. ]?party)/i;
const SKIP_PATH = /(^|\/)(META-INF\/(services|maven|versions)|res|kotlin|androidx)\//;
const NOTICE_EXT = /\.(txt|md|json|html?)$|\/[^./]+$/i;

/**
 * Google's libraries ship third_party_licenses.txt with a third_party_licenses.json index of
 * { "<library>": { start, length } } byte ranges. Split such a pair into one notice per library so
 * the many notices the Google AARs repeat collapse into one copy each.
 */
function splitOssLicenses(files) {
  const out = [];
  for (const f of files) {
    const sibling = f.path.endsWith(".txt") ? files.find((g) => g.path === f.path.replace(/\.txt$/, ".json")) : null;
    if (f.path.endsWith(".json") && files.some((g) => g.path === f.path.replace(/\.json$/, ".txt"))) {
      try {
        if (typeof Object.values(JSON.parse(f.data.toString("utf8")))[0]?.start === "number") continue; // consumed by its .txt
      } catch {
        // not an index; keep it as an ordinary file
      }
    }
    let index = null;
    try {
      index = sibling ? JSON.parse(sibling.data.toString("utf8")) : null;
    } catch {
      index = null;
    }
    if (index && typeof Object.values(index)[0]?.start === "number") {
      for (const [title, { start, length }] of Object.entries(index)) {
        const text = f.data.subarray(start, start + length).toString("utf8");
        // Big sections (the Kotlin and LLVM notices) are lists of separate licenses that differ only in
        // which ones a given library lists. Splitting them at the rulers lets identical parts collapse.
        const parts = text.length > 20_000 ? text.split(/\n[ \t]*[-=]{10,}[ \t]*\n/).filter((p) => p.trim().length > 40) : [text];
        parts.forEach((part, i) => out.push({ path: `${f.path}#${title}${parts.length > 1 ? `[${i + 1}]` : ""}`, title, text: part }));
      }
    } else {
      out.push(f);
    }
  }
  return out;
}

/** License and notice files inside a jar/aar, as [{ path, text, title? }]. */
export function scanArchive(buf) {
  let zip;
  try {
    zip = readZip(buf);
  } catch {
    return [];
  }
  const out = [];
  for (const name of zip.names) {
    if (name.endsWith("/") || /\.(class|so|dex|png|xml|arsc|kotlin_module)$/i.test(name)) continue;
    if (SKIP_PATH.test(name) && !/^META-INF\/[^/]*(licen[sc]e|notice)/i.test(name)) continue;
    const base = name.slice(name.lastIndexOf("/") + 1);
    if (!NOTICE_NAME.test(base) || !NOTICE_EXT.test(name)) continue;
    const data = zip.read(name);
    if (!data || data.length > 3_000_000) continue;
    out.push({ path: name, data });
  }
  return splitOssLicenses(out).map((f) => ({ path: f.path, title: f.title, text: f.text ?? f.data.toString("utf8") }));
}

/**
 * Loads everything the notices need about one Maven artifact: POM facts plus the license and
 * notice files inside its binary. `withBinary` is false for artifacts known to carry none.
 */
export async function loadArtifact(cacheDir, g, a, v, { withBinary }) {
  return cached(cacheDir, `maven-artifact/${g}/${a}-${v}${withBinary ? "" : "-pom"}`, async () => {
    const pom = await loadPom(cacheDir, g, a, v);
    if (!pom) return null;
    const info = {
      g,
      a,
      v,
      name: pom.name,
      url: pom.url,
      scm: pom.scm,
      organization: pom.organization,
      developers: pom.developers,
      licenses: pom.licenses,
      deps: runtimeDeps(pom),
      files: [],
    };
    const ext = pom.packaging === "aar" ? "aar" : pom.packaging === "pom" ? null : "jar";
    if (withBinary && ext) {
      const found = await downloadFirst(repoUrls(g, a, v, ext));
      if (found) info.files = scanArchive(found.data);
    }
    return info;
  });
}
