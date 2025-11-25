import http from 'k6/http';
import { check } from 'k6';

/**
 * Concurrent Load Test
 *
 * This test runs with high concurrency (50 Virtual Users).
 * Multiple concurrent requests are sent to the same endpoint simultaneously.
 *
 * Expected Results:
 * - unsafe endpoint: ~30-60% success rate (race conditions cause failures)
 * - safe-prototype endpoint: ~99%+ success rate
 * - safe-singleton endpoint: ~99%+ success rate
 */

export let options = {
  scenarios: {
    unsafe_load: {
      executor: 'constant-vus',
      vus: 50,           // 50 concurrent users
      duration: '30s',   // Run for 30 seconds
      exec: 'testUnsafe',
    },
    safe_prototype_load: {
      executor: 'constant-vus',
      vus: 50,           // 50 concurrent users
      duration: '30s',   // Run for 30 seconds
      exec: 'testSafePrototype',
      startTime: '35s',  // Start after unsafe test completes
    },
    safe_singleton_load: {
      executor: 'constant-vus',
      vus: 50,           // 50 concurrent users
      duration: '30s',   // Run for 30 seconds
      exec: 'testSafeSingleton',
      startTime: '70s',  // Start after safe-prototype test completes
    },
  },
  thresholds: {
    'checks{endpoint:unsafe}': ['rate < 0.9'],         // Allow some failures
    'checks{endpoint:safe-prototype}': ['rate > 0.99'], // Expect high success
    'checks{endpoint:safe-singleton}': ['rate > 0.99'], // Expect high success
  },
};

const BASE_URL = 'http://localhost:8080';

/**
 * Test the unsafe endpoint with concurrent requests
 * Expect many failures due to race conditions
 */
export function testUnsafe() {
  // Each VU uses its thread name as the ID
  const id = String(__VU);

  let res = http.get(`${BASE_URL}/unsafe/${id}`);

  check(res, {
    'unsafe returns correct id': (r) => {
      let body = r.body.trim();
      let isCorrect = body === id;
      if (!isCorrect) {
        // This is expected - log when we catch the race condition
        // console.log(`RACE CONDITION DETECTED: VU ${__VU} expected ${id}, got ${body}`);
      }
      return isCorrect;
    },
    'status is 200': (r) => r.status === 200,
  }, { endpoint: 'unsafe' });
}

/**
 * Test the safe-prototype endpoint with concurrent requests
 * Expect very high success rate
 */
export function testSafePrototype() {
  const id = String(__VU);

  let res = http.get(`${BASE_URL}/safe-prototype/${id}`);

  check(res, {
    'safe-prototype returns correct id': (r) => {
      let body = r.body.trim();
      return body === id;
    },
    'status is 200': (r) => r.status === 200,
  }, { endpoint: 'safe-prototype' });
}

/**
 * Test the safe-singleton endpoint with concurrent requests
 * Expect very high success rate (BEST PRACTICE pattern)
 */
export function testSafeSingleton() {
  const id = String(__VU);

  let res = http.get(`${BASE_URL}/safe-singleton/${id}`);

  check(res, {
    'safe-singleton returns correct id': (r) => {
      let body = r.body.trim();
      return body === id;
    },
    'status is 200': (r) => r.status === 200,
  }, { endpoint: 'safe-singleton' });
}
