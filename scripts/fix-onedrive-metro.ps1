# OneDrive marks every synced file with an NTFS ReparsePoint. Metro (SDK 57)
# treats reparse-point files as symlinks and DROPS them from its file map,
# breaking bundling with "None of these files exist" for files that exist.
#
# This script rewrites affected source files in place (content unchanged),
# which clears the reparse flag until OneDrive re-syncs them. Run it whenever
# Metro starts failing to resolve files that clearly exist:
#
#   powershell -ExecutionPolicy Bypass -File scripts\fix-onedrive-metro.ps1
#
# The real fix is moving the repo out of OneDrive (see docs/PENDING.md).

$root = Split-Path $PSScriptRoot -Parent
$targets = @("apps\mobile", "packages\shared", "packages\db", "packages\config")
$exts = @('.ts', '.tsx', '.js', '.jsx', '.json', '.png', '.md')
$fixed = 0

foreach ($t in $targets) {
    $dir = Join-Path $root $t
    if (-not (Test-Path $dir)) { continue }
    Get-ChildItem $dir -Recurse -File |
        Where-Object {
            $_.Attributes -band [IO.FileAttributes]::ReparsePoint -and
            $_.FullName -notmatch '\\node_modules\\|\\\.expo\\|\\dist\\' -and
            $exts -contains $_.Extension
        } |
        ForEach-Object {
            $bytes = [IO.File]::ReadAllBytes($_.FullName)
            Remove-Item $_.FullName -Force
            [IO.File]::WriteAllBytes($_.FullName, $bytes)
            $fixed++
        }
}

Write-Host "Cleared reparse flag on $fixed file(s)."
