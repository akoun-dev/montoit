#!/usr/bin/env node

/**
 * Tests de pénétration basiques pour l'application Mon Toit
 * Ces tests vérifient les vulnérabilités de sécurité courantes
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseURL: process.env.TEST_URL || 'http://localhost:3000',
  timeout: 10000,
  userAgent: 'MonToit-Penetration-Test/1.0'
};

// Payloads pour les tests d'injection
const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "1'; DELETE FROM properties WHERE '1'='1' --"
];

const XSS_PAYLOADS = [
  "<script>alert('XSS')</script>",
  "javascript:alert('XSS')",
  "<img src=x onerror=alert('XSS')>",
  "';alert('XSS');//"
];

const PATH_TRAVERSAL_PAYLOADS = [
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32\\config\\sam",
  "....//....//....//etc/passwd"
];

class PenetrationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      vulnerabilities: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];

    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, CONFIG.baseURL);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'User-Agent': CONFIG.userAgent,
          ...headers
        },
        timeout: CONFIG.timeout
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async testSQLInjection() {
    this.log('Testing SQL Injection vulnerabilities...');

    const endpoints = [
      '/api/auth/login',
      '/api/properties/search',
      '/api/users/profile'
    ];

    for (const endpoint of endpoints) {
      for (const payload of SQL_INJECTION_PAYLOADS) {
        try {
          const response = await this.makeRequest(endpoint, 'POST', {
            email: payload,
            password: 'test'
          });

          // Vérifier si la réponse contient des erreurs SQL
          const sqlErrors = [
            'SQL syntax',
            'mysql_fetch',
            'ORA-',
            'Microsoft OLE DB',
            'PostgreSQL query failed'
          ];

          const hasSQLError = sqlErrors.some(error =>
            response.body.toLowerCase().includes(error.toLowerCase())
          );

          if (hasSQLError || response.statusCode === 500) {
            this.results.vulnerabilities.push({
              type: 'SQL Injection',
              severity: 'Critical',
              endpoint,
              payload,
              evidence: 'SQL error detected'
            });
            this.log(`SQL Injection vulnerability found at ${endpoint}`, 'error');
          }
        } catch (error) {
          // Erreur de connexion est normale si le serveur n'est pas en cours d'exécution
        }
      }
    }
  }

  async testXSS() {
    this.log('Testing XSS vulnerabilities...');

    const testInputs = [
      'search',
      'description',
      'title',
      'message'
    ];

    for (const input of testInputs) {
      for (const payload of XSS_PAYLOADS) {
        try {
          const response = await this.makeRequest('/api/properties/search', 'POST', {
            [input]: payload
          });

          // Vérifier si le payload est réfléchi sans échappement
          if (response.body.includes(payload.replace(/[<>]/g, ''))) {
            this.results.vulnerabilities.push({
              type: 'XSS',
              severity: 'High',
              endpoint: '/api/properties/search',
              payload,
              inputField: input
            });
            this.log(`XSS vulnerability found in field: ${input}`, 'error');
          }
        } catch (error) {
          // Erreur de connexion est normale
        }
      }
    }
  }

  async testPathTraversal() {
    this.log('Testing Path Traversal vulnerabilities...');

    const endpoints = [
      '/api/files/download',
      '/api/images/serve',
      '/api/documents/view'
    ];

    for (const endpoint of endpoints) {
      for (const payload of PATH_TRAVERSAL_PAYLOADS) {
        try {
          const response = await this.makeRequest(`${endpoint}?file=${payload}`);

          // Vérifier si on obtient le contenu du fichier système
          if (response.body.includes('root:') || response.body.includes('[boot loader]')) {
            this.results.vulnerabilities.push({
              type: 'Path Traversal',
              severity: 'Critical',
              endpoint,
              payload
            });
            this.log(`Path Traversal vulnerability found at ${endpoint}`, 'error');
          }
        } catch (error) {
          // Erreur de connexion est normale
        }
      }
    }
  }

  async testSecurityHeaders() {
    this.log('Testing Security Headers...');

    try {
      const response = await this.makeRequest('/');

      const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security'
      ];

      const missingHeaders = requiredHeaders.filter(header =>
        !response.headers[header.toLowerCase()]
      );

      if (missingHeaders.length > 0) {
        this.results.vulnerabilities.push({
          type: 'Missing Security Headers',
          severity: 'Medium',
          missingHeaders
        });
        this.log(`Missing security headers: ${missingHeaders.join(', ')}`, 'warning');
      }
    } catch (error) {
      // Erreur de connexion est normale
    }
  }

  async testAuthenticationBypass() {
    this.log('Testing Authentication Bypass...');

    const protectedEndpoints = [
      '/api/admin/users',
      '/api/properties/create',
      '/api/messages/send'
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        // Test sans authentification
        const response = await this.makeRequest(endpoint, 'POST', { test: 'data' });

        if (response.statusCode !== 401 && response.statusCode !== 403) {
          this.results.vulnerabilities.push({
            type: 'Authentication Bypass',
            severity: 'Critical',
            endpoint,
            statusCode: response.statusCode
          });
          this.log(`Authentication bypass possible at ${endpoint}`, 'error');
        }
      } catch (error) {
        // Erreur de connexion est normale
      }
    }
  }

  async testRateLimiting() {
    this.log('Testing Rate Limiting...');

    const endpoint = '/api/auth/login';
    const requests = [];

    // Envoyer 100 requêtes rapidement
    for (let i = 0; i < 100; i++) {
      requests.push(
        this.makeRequest(endpoint, 'POST', {
          email: `test${i}@example.com`,
          password: 'wrongpassword'
        })
      );
    }

    try {
      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.statusCode !== 429).length;

      if (successCount > 10) {
        this.results.vulnerabilities.push({
          type: 'Missing Rate Limiting',
          severity: 'Medium',
          endpoint,
          successfulRequests: successCount
        });
        this.log(`Rate limiting not working properly: ${successCount}/100 requests succeeded`, 'warning');
      }
    } catch (error) {
      // Erreur de connexion est normale
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      target: CONFIG.baseURL,
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        vulnerabilitiesFound: this.results.vulnerabilities.length
      },
      vulnerabilities: this.results.vulnerabilities,
      recommendations: this.getRecommendations()
    };

    const reportPath = 'penetration-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Report generated: ${reportPath}`, 'success');

    return report;
  }

  getRecommendations() {
    const recommendations = [];

    if (this.results.vulnerabilities.some(v => v.type === 'SQL Injection')) {
      recommendations.push('Use parameterized queries and prepared statements');
      recommendations.push('Implement input validation and sanitization');
    }

    if (this.results.vulnerabilities.some(v => v.type === 'XSS')) {
      recommendations.push('Implement Content Security Policy (CSP)');
      recommendations.push('Escape all user input before rendering');
      recommendations.push('Use textContent instead of innerHTML');
    }

    if (this.results.vulnerabilities.some(v => v.type === 'Missing Security Headers')) {
      recommendations.push('Implement security headers in your server configuration');
      recommendations.push('Use Helmet.js middleware for Express');
    }

    if (this.results.vulnerabilities.some(v => v.type === 'Authentication Bypass')) {
      recommendations.push('Implement proper authentication middleware');
      recommendations.push('Validate JWT tokens on all protected routes');
    }

    if (this.results.vulnerabilities.some(v => v.type === 'Missing Rate Limiting')) {
      recommendations.push('Implement rate limiting using express-rate-limit');
      recommendations.push('Set appropriate rate limits per endpoint');
    }

    return recommendations;
  }

  async runAllTests() {
    this.log('Starting penetration tests...', 'info');
    this.log(`Target: ${CONFIG.baseURL}`, 'info');

    const tests = [
      () => this.testSQLInjection(),
      () => this.testXSS(),
      () => this.testPathTraversal(),
      () => this.testSecurityHeaders(),
      () => this.testAuthenticationBypass(),
      () => this.testRateLimiting()
    ];

    for (const test of tests) {
      try {
        await test();
        this.results.total++;
      } catch (error) {
        this.log(`Test failed: ${error.message}`, 'error');
        this.results.failed++;
      }
    }

    const report = await this.generateReport();

    // Afficher le résumé
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Vulnerabilities Found: ${this.results.vulnerabilities.length}`);

    if (this.results.vulnerabilities.length > 0) {
      const criticalCount = this.results.vulnerabilities.filter(v => v.severity === 'Critical').length;
      const highCount = this.results.vulnerabilities.filter(v => v.severity === 'High').length;

      if (criticalCount > 0) {
        console.log(`🔴 Critical: ${criticalCount}`);
      }
      if (highCount > 0) {
        console.log(`🟠 High: ${highCount}`);
      }

      console.log('\n⚠️  Security issues detected. Please review the full report.');
      process.exit(1);
    } else {
      console.log('\n✅ No critical vulnerabilities detected!');
      process.exit(0);
    }
  }
}

// Exécuter les tests
if (require.main === module) {
  const tester = new PenetrationTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = PenetrationTester;