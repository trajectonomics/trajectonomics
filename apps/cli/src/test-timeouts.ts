/**
 * The ceiling for a test whose work is a subprocess (a `traj` start, a writer process) or a long run
 * of commits. That work costs CPU, so on a shared 4-core machine at a load average of 5 to 25 it
 * takes five to twenty-five times its idle time, and the old 30 s ceiling sat only ten to twenty
 * times above it (#236). The tests already wait on a real condition (a process exit, the URL on
 * stderr), so a ceiling this far above them costs a passing run nothing and only bounds a hang.
 */
export const LOADED_MACHINE_MS = 120_000
