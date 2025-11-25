import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Sequential Load Test
 *
 * This test runs with 1 Virtual User (VU) and no concurrency.
 * It sends requests sequentially, waiting between each request.
 *
 * Expected Result: ALL endpoints should pass, including the unsafe one,
 * because there are no concurrent requests to create race conditions.
 */

export let options = {
  vus: 1,              // 1 Virtual User (no concurrency)
  iterations: 9,       // Total 9 requests (3 per endpoint)
  duration: null,      // Run until iterations complete
};

const BASE_URL = 'http://localhost:8080';

export default function () {
  const endpoints = [
    { path: 'unsafe', label: 'Unsafe (Singleton + Private Field)' },
    { path: 'safe-prototype', label: 'Safe (Prototype Scope)' },
    { path: 'safe-singleton', label: 'Safe (Singleton + No Private Field)' }
  ];

  const ids = ['1', '2', '3'];

  // Test each endpoint with sequential requests
  endpoints.forEach(endpoint => {
    console.log(`\nTesting ${endpoint.label}...`);

    ids.forEach(id => {
      let res = http.get(`${BASE_URL}/${endpoint.path}/${id}`);

      let result = check(res, {
        [`${endpoint.path}/${id} returns correct id`]: (r) => {
          let body = r.body.trim();
          let isCorrect = body === id;
          let status = isCorrect ? '✓' : '✗';
          console.log(`  ${status} Request: ${endpoint.path}/${id}, Got: ${body}, Expected: ${id}`);
          return isCorrect;
        },
        [`${endpoint.path} status is 200`]: (r) => r.status === 200,
      });

      // Wait before next request
      sleep(0.5);
    });
  });
}
