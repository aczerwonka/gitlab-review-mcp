#!/usr/bin/env node

/**
 * GitLab Review MCP Server - Installation Verification
 *
 * This script verifies that the MCP server is properly installed and configured.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 GitLab Review MCP Server - Installation Check\n');

const checks = [];

// Check 1: dist/index.js exists
const distPath = path.join(__dirname, 'dist', 'index.js');
if (fs.existsSync(distPath)) {
  checks.push({ name: 'Build output (dist/index.js)', status: '✅', message: 'Found' });
} else {
  checks.push({ name: 'Build output (dist/index.js)', status: '❌', message: 'Not found - Run: npm run build' });
}

// Check 2: package.json exists
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  checks.push({ name: 'package.json', status: '✅', message: `Version ${pkg.version}` });
} else {
  checks.push({ name: 'package.json', status: '❌', message: 'Not found' });
}

// Check 3: node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  checks.push({ name: 'Dependencies (node_modules)', status: '✅', message: 'Installed' });
} else {
  checks.push({ name: 'Dependencies (node_modules)', status: '❌', message: 'Not found - Run: npm install' });
}

// Check 4: MCP SDK dependency
const mcpSdkPath = path.join(__dirname, 'node_modules', '@modelcontextprotocol', 'sdk');
if (fs.existsSync(mcpSdkPath)) {
  checks.push({ name: 'MCP SDK', status: '✅', message: 'Installed' });
} else {
  checks.push({ name: 'MCP SDK', status: '❌', message: 'Not found' });
}

// Check 5: Environment variables
const hasGitLabUrl = !!process.env.GITLAB_BASE_URL;
const hasGitLabToken = !!process.env.GITLAB_TOKEN;

if (hasGitLabUrl && hasGitLabToken) {
  checks.push({ name: 'Environment variables', status: '✅', message: 'Configured' });
} else {
  const missing = [];
  if (!hasGitLabUrl) missing.push('GITLAB_BASE_URL');
  if (!hasGitLabToken) missing.push('GITLAB_TOKEN');
  checks.push({ name: 'Environment variables', status: '⚠️', message: `Missing: ${missing.join(', ')}` });
}

// Print results
console.log('Installation Status:\n');
checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(35)} ${check.message}`);
});

// Summary
const allGood = checks.every(c => c.status === '✅');
const hasWarnings = checks.some(c => c.status === '⚠️');
const hasCritical = checks.some(c => c.status === '❌');

console.log('\n' + '─'.repeat(70) + '\n');

if (allGood) {
  console.log('✅ All checks passed! The server is ready to use.');
  console.log('\nTo start the server:');
  console.log('  node dist/index.js');
} else if (hasCritical) {
  console.log('❌ Critical issues found. Please fix them before running the server.');
  console.log('\nSuggested fixes:');
  checks.forEach(check => {
    if (check.status === '❌') {
      console.log(`  • ${check.message}`);
    }
  });
} else if (hasWarnings) {
  console.log('⚠️  Server is built but environment variables are not set.');
  console.log('\nSet the following variables:');
  console.log('  export GITLAB_BASE_URL="https://gitlab.example.com"');
  console.log('  export GITLAB_TOKEN="your-gitlab-token"');
}

console.log('\n📚 For more information, see:');
console.log('  • README.md - Full documentation');
console.log('  • QUICKSTART.md - Quick setup guide');
console.log('  • mcp-config.example.json - Example MCP configuration\n');

process.exit(hasCritical ? 1 : 0);

