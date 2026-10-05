/**
 * FamilyDrive Automated Benchmark & Performance Test Suite
 * Measures latency percentiles (min, avg, p50, p90, p95, p99, max), RPS, and error rates.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SAMPLES = 50; // Requests per benchmark test

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { min: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / latencies.length) * 10) / 10;
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p90 = latencies[Math.floor(latencies.length * 0.90)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const min = latencies[0];
  const max = latencies[latencies.length - 1];

  return { min, avg, p50, p90, p95, p99, max };
}

async function runBenchmark() {
  console.log('🚀 Starting FamilyDrive Performance & Readiness Benchmarks...');
  console.log(`Target: ${BASE_URL} | Samples per endpoint: ${SAMPLES}\n`);

  const results = {};

  // 1. Benchmark: Public Version & Self-Update Endpoint
  console.log('1. Testing GET /api/app/version (Self-Update & Health)...');
  const versionLatencies = [];
  let versionErrors = 0;
  const startVersion = Date.now();

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/app/version`);
      const t1 = performance.now();
      if (res.ok) {
        versionLatencies.push(Math.round((t1 - t0) * 10) / 10);
      } else {
        versionErrors++;
      }
    } catch (e) {
      versionErrors++;
    }
  }
  const totalVersionTime = (Date.now() - startVersion) / 1000;
  results['version_check'] = {
    endpoint: 'GET /api/app/version',
    category: 'Public Health & Update',
    samples: SAMPLES,
    errors: versionErrors,
    rps: Math.round((SAMPLES / totalVersionTime) * 10) / 10,
    ...calculatePercentiles(versionLatencies),
  };

  // 2. Benchmark: Authentication (POST /api/auth/login with Bcrypt hashing)
  console.log('2. Testing POST /api/auth/login (Bcrypt & JWT signing)...');
  const authLatencies = [];
  let authErrors = 0;
  let sessionCookie = '';
  const startAuth = Date.now();

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'john.dad@example.com',
          password: 'password123',
        }),
      });
      const t1 = performance.now();
      if (res.ok) {
        authLatencies.push(Math.round((t1 - t0) * 10) / 10);
        const setCookie = res.headers.get('set-cookie');
        if (setCookie && !sessionCookie) {
          sessionCookie = setCookie.split(';')[0];
        }
      } else {
        authErrors++;
      }
    } catch (e) {
      authErrors++;
    }
  }
  const totalAuthTime = (Date.now() - startAuth) / 1000;
  results['auth_login'] = {
    endpoint: 'POST /api/auth/login',
    category: 'Authentication & Bcrypt',
    samples: SAMPLES,
    errors: authErrors,
    rps: Math.round((SAMPLES / totalAuthTime) * 10) / 10,
    ...calculatePercentiles(authLatencies),
  };

  const authHeaders = {
    Cookie: sessionCookie,
    'Content-Type': 'application/json',
  };

  // 3. Benchmark: Session Token Verification (GET /api/auth/me)
  console.log('3. Testing GET /api/auth/me (JWT Session Verification)...');
  const meLatencies = [];
  let meErrors = 0;
  const startMe = Date.now();

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
      const t1 = performance.now();
      if (res.ok) {
        meLatencies.push(Math.round((t1 - t0) * 10) / 10);
      } else {
        meErrors++;
      }
    } catch (e) {
      meErrors++;
    }
  }
  const totalMeTime = (Date.now() - startMe) / 1000;
  results['session_verify'] = {
    endpoint: 'GET /api/auth/me',
    category: 'JWT Verification',
    samples: SAMPLES,
    errors: meErrors,
    rps: Math.round((SAMPLES / totalMeTime) * 10) / 10,
    ...calculatePercentiles(meLatencies),
  };

  // 4. Benchmark: Multi-Family Tenant List (GET /api/families)
  console.log('4. Testing GET /api/families (Prisma Multi-Tenant Query)...');
  const familiesLatencies = [];
  let familiesErrors = 0;
  let targetFamilyId = '';
  const startFamilies = Date.now();

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/families`, { headers: authHeaders });
      const t1 = performance.now();
      if (res.ok) {
        const data = await res.json();
        if (data.families && data.families.length > 0 && !targetFamilyId) {
          targetFamilyId = data.families[0].id;
        }
        familiesLatencies.push(Math.round((t1 - t0) * 10) / 10);
      } else {
        familiesErrors++;
      }
    } catch (e) {
      familiesErrors++;
    }
  }
  const totalFamiliesTime = (Date.now() - startFamilies) / 1000;
  results['families_list'] = {
    endpoint: 'GET /api/families',
    category: 'Multi-Tenant Aggregation',
    samples: SAMPLES,
    errors: familiesErrors,
    rps: Math.round((SAMPLES / totalFamiliesTime) * 10) / 10,
    ...calculatePercentiles(familiesLatencies),
  };

  // 5. Benchmark: Drive File Explorer & Tree (GET /api/drive/files)
  console.log(`5. Testing GET /api/drive/files?familyId=${targetFamilyId} (Drive File Tree)...`);
  const filesLatencies = [];
  let filesErrors = 0;
  const startFiles = Date.now();

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/drive/files?familyId=${targetFamilyId}`, {
        headers: authHeaders,
      });
      const t1 = performance.now();
      if (res.ok) {
        filesLatencies.push(Math.round((t1 - t0) * 10) / 10);
      } else {
        filesErrors++;
      }
    } catch (e) {
      filesErrors++;
    }
  }
  const totalFilesTime = (Date.now() - startFiles) / 1000;
  results['drive_files'] = {
    endpoint: 'GET /api/drive/files',
    category: 'Cloud File Explorer',
    samples: SAMPLES,
    errors: filesErrors,
    rps: Math.round((SAMPLES / totalFilesTime) * 10) / 10,
    ...calculatePercentiles(filesLatencies),
  };

  // 6. Benchmark: Notifications & Broadcasts (GET /api/notifications)
  console.log('6. Testing GET /api/notifications (Notification Tray)...');
  const notifLatencies = [];
  let notifErrors = 0;
  const startNotif = Date.now();

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/notifications`, { headers: authHeaders });
      const t1 = performance.now();
      if (res.ok) {
        notifLatencies.push(Math.round((t1 - t0) * 10) / 10);
      } else {
        notifErrors++;
      }
    } catch (e) {
      notifErrors++;
    }
  }
  const totalNotifTime = (Date.now() - startNotif) / 1000;
  results['notifications'] = {
    endpoint: 'GET /api/notifications',
    category: 'Developer Broadcast Feed',
    samples: SAMPLES,
    errors: notifErrors,
    rps: Math.round((SAMPLES / totalNotifTime) * 10) / 10,
    ...calculatePercentiles(notifLatencies),
  };

  console.log('\n================ BENCHMARK RESULTS SUMMARY ================');
  console.table(results);

  const outputPath = path.join(__dirname, 'benchmark_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed benchmark metrics saved to: ${outputPath}`);
}

runBenchmark().catch(console.error);
