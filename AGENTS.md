# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Purpose

This is a **training/demonstration project** that illustrates thread safety issues in Spring Boot singleton controllers. It is **NOT production code** and intentionally contains unsafe patterns for educational purposes.

## Build & Run Commands

All commands should be run from the `springboot-web/` directory.

### Build
```bash
cd springboot-web
mvn clean package
```

### Run Application
```bash
cd springboot-web
mvn spring-boot:run
```

Application runs on `http://localhost:8080`

### Run Tests

**Automated demo (recommended):**
```bash
cd springboot-web
./run-demo.sh
```

This script builds, starts the server, runs both sequential and concurrent K6 tests, then stops the server.

**Manual testing:**
```bash
# Sequential test (1 VU, no concurrency - all endpoints should pass)
cd springboot-web
k6 run k6/sequential-test.js

# Concurrent test (50 VUs - unsafe endpoint should fail ~40-70% of requests)
cd springboot-web
k6 run k6/concurrent-test.js
```

### Manual API Testing
```bash
# Test unsafe endpoint (race condition likely under load)
curl http://localhost:8080/unsafe/123
curl http://localhost:8080/unsafe/123/500    # With 500ms timeout

# Test safe prototype endpoint (new instance per request)
curl http://localhost:8080/safe-prototype/123
curl http://localhost:8080/safe-prototype/123/1000    # With 1000ms timeout

# Test safe singleton endpoint (best practice)
curl http://localhost:8080/safe-singleton/123
curl http://localhost:8080/safe-singleton/123/2000   # With 2000ms timeout
```

### Timeout Configuration

All endpoints support an optional timeout parameter (in milliseconds):

```bash
# Default timeout (100ms)
curl http://localhost:8080/{endpoint}/{id}

# Custom timeout
curl http://localhost:8080/{endpoint}/{id}/{timeout_ms}

# Examples:
curl http://localhost:8080/unsafe/42/250        # 250ms delay
curl http://localhost:8080/safe-singleton/99/5  # 5ms delay
curl http://localhost:8080/safe-prototype/1/2000  # 2 second delay
```

**Note:** Longer timeouts amplify race conditions in the unsafe endpoint, making them easier to observe during manual testing.

## Architecture Overview

### Three Controller Patterns

The application demonstrates three different approaches to handling request-specific data:

1. **UnsafeController** (`/unsafe/{id}`)
   - Scope: Singleton (default)
   - Uses private field to store request data
   - **Thread-unsafe**: Concurrent requests cause race conditions
   - Response includes metadata showing the race condition in action

2. **SafePrototypeController** (`/safe-prototype/{id}`)
   - Scope: Prototype (`@Scope("prototype")`)
   - Uses private field to store request data
   - **Thread-safe**: Each request gets a new controller instance
   - Less efficient than singleton (memory overhead)

3. **SafeSingletonController** (`/safe-singleton/{id}`)
   - Scope: Singleton (default)
   - Uses method parameters/local variables only (no private fields)
   - **Thread-safe**: No shared mutable state
   - **Best practice**: Efficient singleton with thread safety

### Response Format

All endpoints return JSON with diagnostic metadata:
```json
{
  "id": "123",
  "timeout": 100,
  "scope": "singleton",
  "pattern": "private-field",
  "controller": "UnsafeController",
  "timestamp": 1732454400000,
  "thread": "http-nio-8080-exec-1"
}
```

- `id`: The ID value returned (may be incorrect for unsafe endpoint under concurrent load)
- `timeout`: The effective timeout in milliseconds used for this request (default: 100)
- `scope`: The controller scope (singleton or prototype)
- `pattern`: The implementation pattern used
- `controller`: The controller class name
- `timestamp`: Request timestamp
- `thread`: The thread that handled the request

### Critical Thread Safety Rules

When working with this codebase:

1. **DO NOT "fix" the UnsafeController** - it's intentionally unsafe for demonstration
2. **DO NOT add private fields** to SafeSingletonController - this violates the pattern
3. **DO NOT remove `@Scope("prototype")`** from SafePrototypeController
4. **DO maintain the 100ms sleep** in controllers - this amplifies race conditions for testing

### K6 Test Architecture

- **sequential-test.js**: 1 VU, 9 iterations (3 per endpoint), expects 100% success
- **concurrent-test.js**: 50 VUs, 30s per endpoint, staged scenarios
  - Threshold for unsafe: `rate < 0.9` (allows failures)
  - Threshold for safe endpoints: `rate > 0.99` (expects near-perfect)

## Technology Stack

- **Java**: 21
- **Spring Boot**: 3.3.4
- **Maven**: 3.8.0+
- **K6**: 0.50.0+ (load testing)

## Key Principles for This Codebase

1. **This is a training repo**: Code intentionally demonstrates anti-patterns
2. **UnsafeController must remain unsafe**: Its purpose is to show what NOT to do
3. **Tests validate behavior**: Sequential tests pass, concurrent tests expose race conditions
4. **Documentation is critical**: The README explains the "why" behind each pattern
