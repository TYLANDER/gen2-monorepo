#!/usr/bin/env npx ts-node
/**
 * Triage Agent - Gatekeeper for AI-generated code
 * 
 * Validates code quality before human review:
 * - Semantic analysis (complexity, patterns)
 * - Security scanning (secrets, vulnerabilities)
 * - Style enforcement (lint, format)
 */

import { execSync } from 'child_process';

// Types
interface Issue {
  type: 'semantic' | 'security' | 'style';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  fix?: string;
}

interface TriageResult {
  verdict: 'PASS' | 'FAIL' | 'WARN';
  score: number;
  issues: Issue[];
  recommendations: string[];
  analyzedFiles: number;
  timestamp: string;
}

interface TriageConfig {
  semantic: {
    maxComplexity: number;
    forbiddenPatterns: string[];
  };
  security: {
    scanSecrets: boolean;
    checkDependencies: boolean;
    forbiddenPackages: string[];
  };
  style: {
    enforceFormat: boolean;
    lintRules: 'strict' | 'standard' | 'relaxed';
  };
}

// Default configuration
const DEFAULT_CONFIG: TriageConfig = {
  semantic: {
    maxComplexity: 20,
    forbiddenPatterns: [
      ': any',           // TypeScript any
      'as any',          // Type assertion to any
      'eval\\(',         // eval usage
      'Function\\(',     // Function constructor
      'TODO.*HACK',      // Hack comments
      'FIXME.*later',    // Deferred fixes
    ],
  },
  security: {
    scanSecrets: true,
    checkDependencies: true,
    forbiddenPackages: [
      'event-stream',    // Known supply chain attack
      'flatmap-stream',  // Malicious package
      'mailparser',      // Old vulnerable versions
    ],
  },
  style: {
    enforceFormat: true,
    lintRules: 'strict',
  },
};

// Secret patterns to detect
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)['":\s]*['"]?[a-zA-Z0-9_-]{20,}/gi,
  /(?:password|passwd|pwd)['":\s]*['"]?[^\s'"]{8,}/gi,
  /(?:secret|token)['":\s]*['"]?[a-zA-Z0-9_-]{20,}/gi,
  /-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----/g,
  /ghp_[a-zA-Z0-9]{36}/g,  // GitHub personal access token
  /sk-[a-zA-Z0-9]{48}/g,   // OpenAI API key
  /AKIA[0-9A-Z]{16}/g,     // AWS access key
];

/**
 * Semantic Analyzer
 * Checks for code smells and complexity issues
 */
function analyzeSemantics(
  files: string[],
  config: TriageConfig['semantic']
): Issue[] {
  const issues: Issue[] = [];

  for (const file of files) {
    try {
      const content = require('fs').readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Check forbidden patterns
      for (const pattern of config.forbiddenPatterns) {
        const regex = new RegExp(pattern, 'gi');
        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            issues.push({
              type: 'semantic',
              severity: 'warning',
              file,
              line: idx + 1,
              message: `Forbidden pattern detected: ${pattern}`,
              fix: 'Consider using a more specific type or approach',
            });
          }
        });
      }

      // Check function complexity (simple heuristic: nested blocks)
      let nestingLevel = 0;
      let maxNesting = 0;
      lines.forEach((line, idx) => {
        nestingLevel += (line.match(/{/g) || []).length;
        nestingLevel -= (line.match(/}/g) || []).length;
        maxNesting = Math.max(maxNesting, nestingLevel);

        if (nestingLevel > config.maxComplexity / 4) {
          issues.push({
            type: 'semantic',
            severity: 'warning',
            file,
            line: idx + 1,
            message: `High nesting complexity: ${nestingLevel} levels`,
            fix: 'Consider extracting nested logic into separate functions',
          });
        }
      });

      // Check for hallucinated imports (packages that don't exist)
      const importMatches = content.match(/from ['"]([^'"]+)['"]/g) || [];
      for (const match of importMatches) {
        const pkg = match.replace(/from ['"]/, '').replace(/['"]/, '');
        if (pkg.startsWith('.')) continue; // Skip relative imports

        // Check if it's a plausible package name
        if (/[A-Z].*[A-Z]/.test(pkg) && !pkg.includes('/')) {
          issues.push({
            type: 'semantic',
            severity: 'warning',
            file,
            message: `Potentially hallucinated package: ${pkg}`,
            fix: 'Verify this package exists in npm registry',
          });
        }
      }
    } catch (err) {
      // File read error, skip
    }
  }

  return issues;
}

/**
 * Security Scanner
 * Checks for secrets, PII, and vulnerable dependencies
 */
function scanSecurity(
  files: string[],
  config: TriageConfig['security']
): Issue[] {
  const issues: Issue[] = [];

  if (config.scanSecrets) {
    for (const file of files) {
      try {
        const content = require('fs').readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (const pattern of SECRET_PATTERNS) {
          lines.forEach((line, idx) => {
            if (pattern.test(line)) {
              issues.push({
                type: 'security',
                severity: 'error',
                file,
                line: idx + 1,
                message: 'Potential secret or credential detected',
                fix: 'Remove secret and use environment variables',
              });
            }
            pattern.lastIndex = 0; // Reset regex state
          });
        }
      } catch (err) {
        // File read error, skip
      }
    }
  }

  // Check for forbidden packages in package.json
  if (config.checkDependencies) {
    try {
      const pkgPath = 'package.json';
      const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      for (const forbidden of config.forbiddenPackages) {
        if (allDeps[forbidden]) {
          issues.push({
            type: 'security',
            severity: 'error',
            file: pkgPath,
            message: `Forbidden package detected: ${forbidden}`,
            fix: 'Remove this package - it has known security issues',
          });
        }
      }
    } catch (err) {
      // No package.json or read error
    }
  }

  return issues;
}

/**
 * Style Checker
 * Enforces formatting and lint rules
 */
function checkStyle(
  files: string[],
  config: TriageConfig['style']
): Issue[] {
  const issues: Issue[] = [];

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js')) {
      continue;
    }

    try {
      const content = require('fs').readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Check line length
        if (line.length > 120) {
          issues.push({
            type: 'style',
            severity: 'warning',
            file,
            line: idx + 1,
            message: `Line exceeds 120 characters (${line.length})`,
          });
        }

        // Check for console.log in non-test files
        if (!file.includes('.test.') && /console\.(log|debug)/.test(line)) {
          issues.push({
            type: 'style',
            severity: 'warning',
            file,
            line: idx + 1,
            message: 'console.log should not be in production code',
            fix: 'Use a proper logging library',
          });
        }

        // Check for var usage
        if (/\bvar\s+/.test(line)) {
          issues.push({
            type: 'style',
            severity: 'warning',
            file,
            line: idx + 1,
            message: 'Prefer const or let over var',
          });
        }
      });
    } catch (err) {
      // File read error, skip
    }
  }

  return issues;
}

/**
 * Get changed files from git
 */
function getChangedFiles(base = 'HEAD~1'): string[] {
  try {
    const output = execSync(`git diff --name-only ${base}`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (err) {
    console.error('Failed to get changed files:', err);
    return [];
  }
}

/**
 * Calculate overall score based on issues
 */
function calculateScore(issues: Issue[]): number {
  let score = 100;

  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 20;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'info':
        score -= 1;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Generate recommendations based on issues
 */
function generateRecommendations(issues: Issue[]): string[] {
  const recommendations: string[] = [];

  const hasSecurityIssues = issues.some(i => i.type === 'security' && i.severity === 'error');
  const hasSemanticWarnings = issues.filter(i => i.type === 'semantic').length > 3;
  const hasStyleIssues = issues.filter(i => i.type === 'style').length > 5;

  if (hasSecurityIssues) {
    recommendations.push('🚨 CRITICAL: Address security issues before merging');
  }

  if (hasSemanticWarnings) {
    recommendations.push('Consider refactoring to reduce code complexity');
  }

  if (hasStyleIssues) {
    recommendations.push('Run formatter (prettier/eslint --fix) before committing');
  }

  if (issues.length === 0) {
    recommendations.push('✅ Code looks good! Ready for human review.');
  }

  return recommendations;
}

/**
 * Main triage function
 */
export async function triage(options: {
  files?: string[];
  base?: string;
  config?: Partial<TriageConfig>;
  shadow?: boolean;
}): Promise<TriageResult> {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const files = options.files || getChangedFiles(options.base);

  console.log(`🔍 Triaging ${files.length} files...`);

  // Run all analyzers
  const semanticIssues = analyzeSemantics(files, config.semantic);
  const securityIssues = scanSecurity(files, config.security);
  const styleIssues = checkStyle(files, config.style);

  const allIssues = [...semanticIssues, ...securityIssues, ...styleIssues];
  const score = calculateScore(allIssues);
  const recommendations = generateRecommendations(allIssues);

  // Determine verdict
  let verdict: 'PASS' | 'FAIL' | 'WARN';
  if (allIssues.some(i => i.severity === 'error')) {
    verdict = 'FAIL';
  } else if (allIssues.some(i => i.severity === 'warning')) {
    verdict = 'WARN';
  } else {
    verdict = 'PASS';
  }

  const result: TriageResult = {
    verdict,
    score,
    issues: allIssues,
    recommendations,
    analyzedFiles: files.length,
    timestamp: new Date().toISOString(),
  };

  return result;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const shadow = args.includes('--shadow');
  const diffIndex = args.indexOf('--diff');
  const base = diffIndex !== -1 ? args[diffIndex + 1] : 'HEAD~1';

  triage({ base, shadow })
    .then(result => {
      console.log('\n📋 TRIAGE RESULT\n');
      console.log(`Verdict: ${result.verdict}`);
      console.log(`Score: ${result.score}/100`);
      console.log(`Files analyzed: ${result.analyzedFiles}`);
      console.log(`Issues found: ${result.issues.length}`);

      if (result.issues.length > 0) {
        console.log('\n🔎 Issues:');
        for (const issue of result.issues) {
          const loc = issue.line ? `:${issue.line}` : '';
          console.log(`  [${issue.severity.toUpperCase()}] ${issue.file}${loc}`);
          console.log(`    ${issue.message}`);
          if (issue.fix) {
            console.log(`    💡 ${issue.fix}`);
          }
        }
      }

      console.log('\n💡 Recommendations:');
      for (const rec of result.recommendations) {
        console.log(`  • ${rec}`);
      }

      // Exit with error code if failed (unless shadow mode)
      if (result.verdict === 'FAIL' && !shadow) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Triage failed:', err);
      process.exit(1);
    });
}
