# Forwarding installer: the last thing trajectonomics/cli serves. traj moved to
# trajectonomics/trajectonomics, so this says so and runs that repository's installer.
# TRAJ_VERSION and TRAJ_INSTALL_DIR pass through unchanged, because the child reads them from
# the same process environment. Published only as an asset of release v0.3.1-moved in
# trajectonomics/cli; see README.md in this folder.
$ErrorActionPreference = "Stop"

$NEW_BASE = "https://github.com/trajectonomics/trajectonomics/releases/latest/download"

Write-Host "traj moved to github.com/trajectonomics/trajectonomics; installing from there."

$script = Join-Path ([System.IO.Path]::GetTempPath()) ("traj-forward-" + [System.Guid]::NewGuid() + ".ps1")
try {
	try {
		Invoke-WebRequest -Uri "$NEW_BASE/install.ps1" -OutFile $script -UseBasicParsing
	}
	catch {
		Write-Host "traj: could not fetch $NEW_BASE/install.ps1; check your network and retry." -ForegroundColor Red
		exit 1
	}
	& $script
}
finally {
	Remove-Item -Path $script -Force -ErrorAction SilentlyContinue
}
