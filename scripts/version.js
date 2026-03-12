#!/usr/bin/env node

/**
 * Stubrix Semantic Versioning Script
 * 
 * This script automatically updates package versions based on conventional commits
 * and ensures proper dependency versioning across the monorepo.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PACKAGES = [
  'packages/shared',
  'packages/api',
  'packages/db-ui',
  'packages/mock-ui',
  'packages/ui'
];

const ROOT_PACKAGE = 'package.json';

// Version increment mapping based on conventional commit types
const VERSION_MAP = {
  'feat': 'patch',
  'fix': 'patch', 
  'perf': 'patch',
  'docs': 'patch',
  'style': 'patch',
  'refactor': 'patch',
  'test': 'patch',
  'chore': 'patch',
  'BREAKING CHANGE': 'major',
  'breaking': 'major'
};

/**
 * Read and parse package.json
 */
function readPackageJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Write package.json with proper formatting
 */
function writePackageJson(filePath, packageData) {
  const content = JSON.stringify(packageData, null, 2) + '\n';
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Get current version from package.json
 */
function getCurrentVersion(packagePath) {
  const packageData = readPackageJson(packagePath);
  return packageData.version || '1.0.0';
}

/**
 * Increment version based on semver
 */
function incrementVersion(currentVersion, incrementType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (incrementType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return currentVersion;
  }
}

/**
 * Determine version increment type from recent commits
 */
function getVersionIncrementType() {
  try {
    // Get last commit message
    const lastCommit = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' });
    
    // Check for breaking changes first
    if (lastCommit.toLowerCase().includes('breaking') || 
        lastCommit.includes('💥') ||
        lastCommit.toLowerCase().includes('break')) {
      return 'major';
    }
    
    // Check commit type from conventional commit format
    const commitMatch = lastCommit.match(/(\w+)(\(.+\))?:/);
    if (commitMatch) {
      const commitType = commitMatch[1];
      return VERSION_MAP[commitType] || 'patch';
    }
    
    // Check for feature indicator
    if (lastCommit.includes('✨') || lastCommit.toLowerCase().includes('feat')) {
      return 'minor';
    }
    
    return 'patch';
  } catch (error) {
    console.warn('Could not determine commit type, using patch version');
    return 'patch';
  }
}

/**
 * Update package version
 */
function updatePackageVersion(packagePath, incrementType) {
  const currentVersion = getCurrentVersion(packagePath);
  const newVersion = incrementVersion(currentVersion, incrementType);
  
  const packageData = readPackageJson(packagePath);
  packageData.version = newVersion;
  
  writePackageJson(packagePath, packageData);
  
  return { currentVersion, newVersion };
}

/**
 * Update internal dependencies to use workspace protocol
 */
function updateInternalDependencies(packagePath) {
  const packageData = readPackageJson(packagePath);
  
  // Update dependencies to use workspace protocol
  ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
    if (packageData[depType]) {
      Object.keys(packageData[depType]).forEach(depName => {
        if (depName.startsWith('@stubrix/') && packageData[depType][depName] !== '*') {
          packageData[depType][depName] = 'workspace:*';
        }
      });
    }
  });
  
  writePackageJson(packagePath, packageData);
}

/**
 * Main version update function
 */
function updateVersions(options = {}) {
  const { forceType, dryRun = false } = options;
  
  console.log('🔄 Stubrix Semantic Versioning\n');
  
  // Determine increment type
  const incrementType = forceType || getVersionIncrementType();
  console.log(`📦 Version increment type: ${incrementType}`);
  
  // Update root package
  if (!dryRun) {
    const rootResult = updatePackageVersion(ROOT_PACKAGE, incrementType);
    console.log(`📋 Root: ${rootResult.currentVersion} → ${rootResult.newVersion}`);
  } else {
    console.log(`📋 Root: would update with ${incrementType} increment`);
  }
  
  // Update workspace packages
  PACKAGES.forEach(packagePath => {
    const packageJsonPath = path.join(packagePath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      if (!dryRun) {
        const result = updatePackageVersion(packageJsonPath, incrementType);
        console.log(`📦 ${packagePath}: ${result.currentVersion} → ${result.newVersion}`);
        
        // Update internal dependencies
        updateInternalDependencies(packageJsonPath);
      } else {
        console.log(`📦 ${packagePath}: would update with ${incrementType} increment`);
      }
    }
  });
  
  console.log('\n✅ Version update completed!');
  
  if (!dryRun) {
    console.log('\n💡 Next steps:');
    console.log('   npm run build:shared   # Build shared package first');
    console.log('   npm run build          # Build all packages');
    console.log('   git add . && git commit -m "🔧 chore(version): update package versions"');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  if (args.includes('--dry-run')) {
    options.dryRun = true;
  }
  
  if (args.includes('--major')) {
    options.forceType = 'major';
  } else if (args.includes('--minor')) {
    options.forceType = 'minor';
  } else if (args.includes('--patch')) {
    options.forceType = 'patch';
  }
  
  updateVersions(options);
}

module.exports = { updateVersions };
