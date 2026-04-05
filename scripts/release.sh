#!/bin/bash
# release.sh - Automated release script for Omni Clock
# Usage: ./scripts/release.sh [version]
# Example: ./scripts/release.sh 0.4.1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version from argument or prompt
if [ -z "$1" ]; then
    echo -e "${YELLOW}Please provide a version number${NC}"
    echo "Usage: ./scripts/release.sh <version>"
    echo "Example: ./scripts/release.sh 0.4.1"
    exit 1
fi

VERSION="$1"

# Validate version format (semver)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format '$VERSION'${NC}"
    echo "Please use semantic versioning (e.g., 0.4.1)"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Omni Clock Release Script v$VERSION${NC}"
echo -e "${GREEN}========================================${NC}"

# Step 1: Check for uncommitted changes
echo -e "\n${YELLOW}[1/6] Checking for uncommitted changes...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    git status
    exit 1
fi
echo -e "${GREEN}✓ No uncommitted changes${NC}"

# Step 2: Update version in package.json
echo -e "\n${YELLOW}[2/6] Updating version in package.json...${NC}"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
rm package.json.bak
echo -e "${GREEN}✓ Updated package.json to v$VERSION${NC}"

# Step 3: Update version in src-tauri/tauri.conf.json
echo -e "\n${YELLOW}[3/6] Updating version in tauri.conf.json...${NC}"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
rm src-tauri/tauri.conf.json.bak
echo -e "${GREEN}✓ Updated tauri.conf.json to v$VERSION${NC}"

# Step 4: Commit version changes
echo -e "\n${YELLOW}[4/6] Committing version changes...${NC}"
git add -A
git commit -m "release: bump version to v$VERSION"
echo -e "${GREEN}✓ Committed version bump${NC}"

# Step 5: Create and push tag
echo -e "\n${YELLOW}[5/6] Creating and pushing tag v$VERSION...${NC}"
git tag "v$VERSION"
git push origin "v$VERSION"
echo -e "${GREEN}✓ Pushed tag v$VERSION${NC}"

# Step 6: Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Release v$VERSION initiated!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. GitHub Actions will automatically build and release"
echo "2. Monitor: https://github.com/mikannse/OmniClock/actions"
echo "3. After release, add TAURI_SIGNING_PRIVATE_KEY to GitHub Secrets if not already done"
echo ""
echo -e "${YELLOW}To add signing key (first time only):${NC}"
echo "  1. Run: cat src-tauri/key.pem"
echo "  2. Go to GitHub → Settings → Secrets → Actions → New secret"
echo "  3. Name: TAURI_SIGNING_PRIVATE_KEY"
echo "  4. Paste the private key content"
