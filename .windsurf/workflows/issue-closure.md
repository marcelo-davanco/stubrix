---
description: GitHub Issue Closure and Documentation Workflow
---

# GitHub Issue Closure Workflow

This workflow ensures consistent and thorough issue closure with proper documentation after PR merges.

## When to Use This Workflow

✅ **TRIGGER**: After a PR is successfully merged to main branch
✅ **APPLIES TO**: All feature issues, bug fixes, and enhancements
✅ **REQUIREMENT**: All acceptance criteria must be fully implemented

## Step-by-Step Process

### 1. Verify Implementation Completeness
```bash
# Verify all tests pass
npm test

# Verify build succeeds  
npm run build

# Verify version is bumped
npm run version:dry
```

### 2. Close Related GitHub Issues
For each issue resolved by the PR:

```bash
# Update issue with completion status
gh issue edit [ISSUE_NUMBER] --state closed
```

### 3. Document Issue Resolution
Use the standardized template for each closed issue:

```markdown
## ✅ **COMPLETED** - [Feature Name]

### **Delivered in PR #[PR_NUMBER]:** [PR Title](PR_URL)

---

### 🎯 **What was implemented:**

#### **✅ All Acceptance Criteria Met:**
- [x] [Criterion 1 from issue]
- [x] [Criterion 2 from issue]  
- [x] [Criterion 3 from issue]

#### **🔧 Technical Implementation:**
- **Implementation Detail 1**: Brief description
- **Implementation Detail 2**: Brief description
- **Implementation Detail 3**: Brief description

#### **📊 API Examples/Code Snippets:**
```typescript
// Example of key implementation
```

#### **🧪 Testing Coverage:**
- **X unit tests** covering functionality
- **Edge cases** and error scenarios
- **Integration tests** if applicable

---

### 🚀 **Impact:**
- **Benefit 1**: Description of user value
- **Benefit 2**: Description of technical improvement
- **Developer Experience**: How this improves DX

**Issue #[ISSUE_NUMBER] has been successfully completed and merged into main v[VERSION]!** 🎯
```

### 4. Update Project Documentation
- Update README.md if applicable
- Update feature documentation
- Update API documentation if endpoints changed

### 5. Verify Issue Status
```bash
# List closed issues
gh issue list --state closed --limit 10

# Verify issue is properly documented
gh issue view [ISSUE_NUMBER]
```

## Automation Script

### Complete Issue Closure Script
```bash
#!/bin/bash
# close-issue.sh [PR_NUMBER] [ISSUE_NUMBER] [VERSION]

PR_NUMBER=$1
ISSUE_NUMBER=$2  
VERSION=$3

# Get PR details
PR_URL=$(gh pr view $PR_NUMBER --json url -q .url)
PR_TITLE=$(gh pr view $PR_NUMBER --json title -q .title)

# Close issue with documentation
gh issue edit $ISSUE_NUMBER --state closed --body "
## ✅ **COMPLETED** - Feature Implementation

### **Delivered in PR #$PR_NUMBER:** $PR_TITLE

### **PR URL:** $PR_URL
### **Version:** v$VERSION

---

### 🎯 **What was implemented:**
[Add implementation details here]

---

### 🚀 **Impact:**
[Add impact description here]

**Issue #$ISSUE_NUMBER has been successfully completed and merged into main v$VERSION!** 🎯
"

echo "Issue #$ISSUE_NUMBER closed and documented"
```

## Quality Checklist

Before closing issues, verify:

- [ ] All acceptance criteria are implemented
- [ ] All tests are passing
- [ ] Build is successful  
- [ ] Code review is completed
- [ ] Version is properly bumped
- [ ] PR is merged to main
- [ ] Issue documentation is complete
- [ ] Related issues are identified and linked

## Examples

### Example 1: Feature Issue
```markdown
## ✅ **COMPLETED** - Recording Filters

### **Delivered in PR #28:** ✨ F4: Recording filters and HAR/Postman import

---

### 🎯 **What was implemented:**

#### **✅ All Acceptance Criteria Met:**
- [x] StartRecordingDto updated with optional includePatterns and excludePatterns
- [x] Recording service filters requests before persisting using minimatch
- [x] API endpoints support filter parameters in stop and snapshot
- [x] MCP tools support filter parameters (via query params)
- [x] Documentation updated (Swagger API docs)

#### **🔧 Technical Implementation:**
- **Pattern Matching**: Wildcard support (*, **) with minimatch@7.0.5
- **Smart Filtering**: Applied post-recording to avoid data loss
- **Query Parameters**: includePatterns & excludePatterns in stop/snapshot endpoints

#### **🧪 Testing Coverage:**
- **9 unit tests** covering all filter scenarios
- **Pattern matching validation** with wildcards
- **Error handling** for invalid patterns

---

### 🚀 **Impact:**
- **Better Control**: Users can focus recordings on relevant endpoints
- **Reduced Noise**: Exclude health checks, metrics, and other noisy endpoints
- **Developer Experience**: Intuitive pattern matching with standard glob syntax

**Issue #19 has been successfully completed and merged into main v1.1.0!** 🎯
```

### Example 2: Bug Fix Issue
```markdown
## ✅ **COMPLETED** - Fix Database Connection Timeout

### **Delivered in PR #31:** 🔧 Fix database connection timeout in production

---

### 🎯 **What was implemented:**

#### **✅ All Acceptance Criteria Met:**
- [x] Connection timeout increased from 5s to 30s
- [x] Added retry logic for failed connections
- [x] Improved error logging and monitoring

#### **🔧 Technical Implementation:**
- **Timeout Configuration**: Updated connection pool settings
- **Retry Logic**: Exponential backoff with max 3 attempts
- **Monitoring**: Added connection health checks

#### **🧪 Testing Coverage:**
- **5 unit tests** for connection retry logic
- **Integration tests** with simulated timeouts
- **Load tests** for connection pool behavior

---

### 🚀 **Impact:**
- **Reliability**: Reduced connection failures in production
- **User Experience**: Fewer timeout errors for users
- **Monitoring**: Better visibility into connection issues

**Issue #45 has been successfully completed and merged into main v1.1.1!** 🎯
```

## Integration with Development Workflow

This workflow integrates seamlessly with:

1. **Version Management**: Use after version bump process
2. **Release Process**: Part of the release checklist
3. **Project Management**: Ensures proper issue tracking
4. **Documentation**: Maintains project history

## Tools and Commands

### GitHub CLI Commands
```bash
# Close issue
gh issue close [ISSUE_NUMBER]

# Edit issue with comment
gh issue edit [ISSUE_NUMBER] --body "documentation"

# Add comment to issue
gh issue comment [ISSUE_NUMBER] --body "Additional notes"

# List issues
gh issue list --state closed --label "enhancement"
```

### Automation Integration
This workflow can be automated with:
- GitHub Actions for PR merge hooks
- Scripts for batch issue updates
- Templates for consistent documentation

This ensures every issue is properly closed and documented!
