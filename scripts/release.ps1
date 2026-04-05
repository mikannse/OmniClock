# release.ps1 - Automated release script for Omni Clock
# Usage: .\scripts\release.ps1 -Version "0.4.1"
param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

# Colors for output
$Red = "`e[0;31m"
$Green = "`e[0;32m"
$Yellow = "`e[1;33m"
$NC = "`e[0m" # No Color

# Validate version format (semver)
if ($Version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') {
    Write-Host "${Red}Error: Invalid version format '$Version'${NC}" -ForegroundColor Red
    Write-Host "Please use semantic versioning (e.g., 0.4.1)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "${Green}========================================${NC}" -ForegroundColor Green
Write-Host "${Green}  Omni Clock Release Script v$Version${NC}" -ForegroundColor Green
Write-Host "${Green}========================================${NC}" -ForegroundColor Green

# Step 1: Check for uncommitted changes
Write-Host ""
Write-Host "${Yellow}[1/6] Checking for uncommitted changes...${NC}" -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "${Red}Error: You have uncommitted changes. Please commit or stash them first.${NC}" -ForegroundColor Red
    git status
    exit 1
}
Write-Host "${Green}✓ No uncommitted changes${NC}" -ForegroundColor Green

# Step 2: Update version in package.json
Write-Host ""
Write-Host "${Yellow}[2/6] Updating version in package.json...${NC}" -ForegroundColor Yellow
(Get-Content package.json) -replace '"version": "[^"]*"', "\"version`: `"$Version`"" | Set-Content package.json
Write-Host "${Green}✓ Updated package.json to v$Version${NC}" -ForegroundColor Green

# Step 3: Update version in src-tauri/tauri.conf.json
Write-Host ""
Write-Host "${Yellow}[3/6] Updating version in tauri.conf.json...${NC}" -ForegroundColor Yellow
(Get-Content src-tauri/tauri.conf.json) -replace '"version": "[^"]*"', "\"version`: `"$Version`"" | Set-Content src-tauri/tauri.conf.json
Write-Host "${Green}✓ Updated tauri.conf.json to v$Version${NC}" -ForegroundColor Green

# Step 4: Commit version changes
Write-Host ""
Write-Host "${Yellow}[4/6] Committing version changes...${NC}" -ForegroundColor Yellow
git add -A
git commit -m "release: bump version to v$Version"
Write-Host "${Green}✓ Committed version bump${NC}" -ForegroundColor Green

# Step 5: Create and push tag
Write-Host ""
Write-Host "${Yellow}[5/6] Creating and pushing tag v$Version...${NC}" -ForegroundColor Yellow
git tag "v$Version"
git push origin "v$Version"
Write-Host "${Green}✓ Pushed tag v$Version${NC}" -ForegroundColor Green

# Step 6: Summary
Write-Host ""
Write-Host "${Green}========================================${NC}" -ForegroundColor Green
Write-Host "${Green}  Release v$Version initiated!${NC}" -ForegroundColor Green
Write-Host "${Green}========================================${NC}" -ForegroundColor Green
Write-Host ""
Write-Host "${Yellow}Next steps:${NC}" -ForegroundColor Yellow
Write-Host "1. GitHub Actions will automatically build and release"
Write-Host "2. Monitor: https://github.com/mikannse/OmniClock/actions"
Write-Host "3. After release, add TAURI_SIGNING_PRIVATE_KEY to GitHub Secrets if not already done"
Write-Host ""
Write-Host "${Yellow}To add signing key (first time only):${NC}" -ForegroundColor Yellow
Write-Host "  1. Run: Get-Content src-tauri\key.pem"
Write-Host "  2. Go to GitHub → Settings → Secrets → Actions → New secret"
Write-Host "  3. Name: TAURI_SIGNING_PRIVATE_KEY"
Write-Host "  4. Paste the private key content"
