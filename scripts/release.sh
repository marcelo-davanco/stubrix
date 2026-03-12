#!/bin/bash

# Stubrix Automated Release Script
# Ensures consistent versioning across all packages

set -e

echo "🔄 Starting Stubrix Release Process"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if we're on main branch
    if [[ $(git branch --show-current) != "main" ]]; then
        print_error "Must be on main branch. Current: $(git branch --show-current)"
        exit 1
    fi
    print_success "On main branch"
    
    # Check if working directory is clean
    if [[ -n $(git status --porcelain) ]]; then
        print_error "Working directory not clean:"
        git status --porcelain
        exit 1
    fi
    print_success "Working directory clean"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm not found"
        exit 1
    fi
    print_success "npm available"
}

# 2. Pull latest changes
pull_latest() {
    print_info "Pulling latest changes from origin/main..."
    git pull origin main
    print_success "Latest changes pulled"
}

# 3. Preview version changes
preview_version() {
    print_info "Previewing version changes..."
    npm run version:dry
    echo ""
    print_warning "Review the changes above before proceeding"
}

# 4. Get version type from user
get_version_type() {
    echo ""
    print_info "Select version type:"
    echo "1) patch (bug fixes, completed features)"
    echo "2) minor (new features)"
    echo "3) major (breaking changes)"
    echo ""
    read -p "Choose (1-3): " choice
    
    case $choice in
        1) 
            VERSION_TYPE="patch"
            print_success "Selected: patch version"
            ;;
        2) 
            VERSION_TYPE="minor"
            print_success "Selected: minor version"
            ;;
        3) 
            VERSION_TYPE="major"
            print_success "Selected: major version"
            ;;
        *) 
            print_error "Invalid choice. Please select 1, 2, or 3."
            exit 1
            ;;
    esac
}

# 5. Apply version
apply_version() {
    print_info "Applying $VERSION_TYPE version..."
    npm run version:$VERSION_TYPE
    
    # Get new version
    NEW_VERSION=$(node -p "require('./package.json').version")
    print_success "Version updated to $NEW_VERSION"
}

# 6. Verify version consistency
verify_version() {
    print_info "Verifying version consistency across packages..."
    
    # Check all package.json files have the same version
    EXPECTED_VERSION=$(node -p "require('./package.json').version")
    
    for pkg in packages/*/package.json; do
        PKG_VERSION=$(node -p "require('$pkg').version")
        if [[ "$PKG_VERSION" != "$EXPECTED_VERSION" ]]; then
            print_error "Version mismatch in $pkg: $PKG_VERSION (expected $EXPECTED_VERSION)"
            exit 1
        fi
    done
    
    print_success "All packages have consistent version: $EXPECTED_VERSION"
}

# 7. Build packages
build_packages() {
    print_info "Building all packages..."
    npm run build
    print_success "All packages built successfully"
}

# 8. Run tests
run_tests() {
    print_info "Running tests..."
    npm test
    print_success "All tests passed"
}

# 9. Commit version changes
commit_version() {
    print_info "Committing version changes..."
    git add .
    git commit -m "🔖 chore: bump version to $NEW_VERSION"
    print_success "Version changes committed"
}

# 10. Create and push tag
create_tag() {
    print_info "Creating git tag..."
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    print_success "Tag v$NEW_VERSION created"
}

# 11. Push to remote
push_changes() {
    print_info "Pushing to remote..."
    git push origin main
    git push origin main --tags
    print_success "Changes and tags pushed to remote"
}

# 12. Optional: Create GitHub release
create_github_release() {
    echo ""
    read -p "Create GitHub release? (y/N): " create_release
    
    if [[ $create_release =~ ^[Yy]$ ]]; then
        print_info "Creating GitHub release..."
        
        # Get recent commits for changelog
        COMMITS=$(git log --oneline --since="1 week ago" | head -10)
        
        # Create release
        gh release create "v$NEW_VERSION" \
            --title "Release v$NEW_VERSION" \
            --notes "## Changes v$NEW_VERSION

$COMMITS

### Features
- F3 Database Snapshots completed
- MySQL and SQLite real snapshot/restore
- Comprehensive test coverage
- Error handling improvements

### Installation
\`\`\`bash
npm install stubrix@$NEW_VERSION
\`\`\`"
        
        print_success "GitHub release created"
    fi
}

# Main execution
main() {
    echo ""
    print_info "Stubrix Automated Release Script"
    print_info "================================"
    echo ""
    
    check_prerequisites
    pull_latest
    preview_version
    get_version_type
    
    echo ""
    read -p "Continue with version bump? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_warning "Release cancelled by user"
        exit 0
    fi
    
    apply_version
    verify_version
    build_packages
    run_tests
    commit_version
    create_tag
    push_changes
    create_github_release
    
    echo ""
    print_success "🎉 Release v$NEW_VERSION completed successfully!"
    print_info "Summary:"
    echo "  - Version: $NEW_VERSION"
    echo "  - Type: $VERSION_TYPE"
    echo "  - Tag: v$NEW_VERSION"
    echo "  - All packages: ✅ Built"
    echo "  - All tests: ✅ Passed"
    echo "  - Remote: ✅ Pushed"
    echo ""
}

# Handle script interruption
trap 'print_warning "Release interrupted by user"; exit 1' INT

# Run main function
main "$@"
