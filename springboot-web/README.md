# Thread Safety Demo - Spring Boot Application

A minimal Spring Boot application demonstrating thread safety issues in singleton controllers and how to solve them.

## Overview

This project demonstrates three different approaches to handling request-specific data in Spring controllers:

1. **❌ Unsafe** - Singleton controller with private field (THREAD-UNSAFE)
2. **✅ Safe (Prototype)** - Prototype-scoped controller with private field (THREAD-SAFE)
3. **✅ Safe (Singleton)** - Singleton controller without private field (THREAD-SAFE, RECOMMENDED)

## Problem: Thread Safety in Singleton Controllers

By default, Spring creates a **single instance** of each `@RestController` and reuses it for all incoming requests. This is efficient, but creates a problem when you store **request-specific data** in private fields.

### The Issue

```java
@RestController
public class UnsafeController {
    private String id;  // ❌ PROBLEM: Shared across all requests!

    @GetMapping("/{id}")
    public String get(@PathVariable String id) {
        this.id = id;           // Thread A: id = "1"
        Thread.sleep(100);      // Simulate processing
        return this.id;         // Thread B: id = "2"
                               // Thread A gets "2" instead of "1"!
    }
}
```

With concurrent requests:
1. **Thread A** calls `/get/1` → sets `this.id = "1"`
2. **Thread B** calls `/get/2` → sets `this.id = "2"`  ← Overwrites!
3. **Thread A** retrieves `this.id` → Gets `"2"` (WRONG!)

### Live Demonstration

To see the race condition in action with two simple curl commands:

**Terminal 1: Start a slow request (20 second timeout)**
```bash
curl http://localhost:8080/unsafe/jakarta/20000 &
```

**Terminal 1: Immediately send a fast request (1ms timeout)**
```bash
curl http://localhost:8080/unsafe/bandung/1
```

**Expected Results:**
- Fast request (`bandung/1`) returns immediately: `bandung`
- Slow request (`jakarta/20000`) should return: `jakarta`

**Actual Results (race condition detected):**
```
bandung      ✅ Fast request correct
jakarta      ✅ Expected "jakarta", but got "bandung" ❌ RACE CONDITION!
```

**Why it happens:**
- Both requests use the **same singleton controller instance**
- Request 1 sets `privateId = "jakarta"`, then sleeps for 20 seconds
- Request 2 sets `privateId = "bandung"`, then sleeps for 1ms (overwrites!)
- Request 2 wakes up, reads `privateId` → gets "bandung" ✅ (correct, but by accident)
- Request 1 wakes up after 20s, reads `privateId` → gets "bandung" ❌ (WRONG! Should be "jakarta")

## Solutions

### Solution 1: Prototype Scope (Works, but less efficient)

```java
@RestController
@Scope("prototype")  // New instance per request
public class SafePrototypeController {
    private String id;  // ✅ SAFE: Each request gets its own instance

    @GetMapping("/{id}")
    public String get(@PathVariable String id) {
        this.id = id;
        Thread.sleep(100);
        return this.id;  // Always correct
    }
}
```

**Pros:** Simple fix, thread-safe
**Cons:** Creates many instances, more memory usage, slower

### Solution 2: Singleton + No Private Fields (BEST PRACTICE)

```java
@RestController
public class SafeSingletonController {
    // NO private fields for request data!

    @GetMapping("/{id}")
    public String get(@PathVariable String id) {
        // Use method parameter or local variable (thread-local)
        Thread.sleep(100);
        return id;  // ✅ SAFE: Always from method parameter
    }
}
```

**Pros:** Efficient singleton instance, thread-safe, best practice
**Cons:** Requires discipline to not store request data in fields

## Architecture

### Controllers

| Endpoint | Scope | Private Field | Thread-Safe | Status |
|----------|-------|---------------|-------------|--------|
| `/unsafe/{id}[/{timeout}]` | Singleton | Yes | ❌ No | Demonstrates problem |
| `/safe-prototype/{id}[/{timeout}]` | Prototype | Yes | ✅ Yes | Solution 1 |
| `/safe-singleton/{id}[/{timeout}]` | Singleton | No | ✅ Yes | Solution 2 (Recommended) |

**Note:** `{timeout}` is optional and specifies delay in milliseconds (default: 100ms).

### Response Format

All endpoints return plain text (just the ID value):

```
jakarta
```

This simple response format makes it easy to test with curl and clearly see race conditions.

## Running the Demo

### Option 1: Automated (Easy)

```bash
chmod +x run-demo.sh
./run-demo.sh
```

This script:
1. Builds the project (`mvn clean package`)
2. Starts Spring Boot (`mvn spring-boot:run`)
3. Waits 20 seconds for startup
4. Runs sequential test (K6)
5. Runs concurrent test (K6)
6. Stops Spring Boot

### Option 2: Manual Steps

**Terminal 1: Start Spring Boot**
```bash
mvn clean package
mvn spring-boot:run
```

**Terminal 2: Run sequential test**
```bash
k6 run k6/sequential-test.js
```

**Terminal 3: Run concurrent test**
```bash
k6 run k6/concurrent-test.js
```

## Test Scenarios

### Sequential Test (`k6/sequential-test.js`)

- **VUs:** 1 (single user, no concurrency)
- **Iterations:** 9 (3 requests per endpoint)
- **Test IDs:** 1, 2, 3 (sequential)

**Expected Result:** ✅ 100% success for all endpoints

Why? Without concurrent requests, there are no race conditions, so even the unsafe endpoint works correctly.

```
✓ unsafe/1 returns correct id
✓ unsafe/2 returns correct id
✓ unsafe/3 returns correct id
✓ safe-prototype/1 returns correct id
✓ safe-prototype/2 returns correct id
✓ safe-prototype/3 returns correct id
✓ safe-singleton/1 returns correct id
✓ safe-singleton/2 returns correct id
✓ safe-singleton/3 returns correct id
```

### Concurrent Test (`k6/concurrent-test.js`)

- **VUs:** 50 (concurrent users)
- **Duration:** 30 seconds per endpoint
- **Test IDs:** Random 1-100

**Expected Results:**

| Endpoint | Success Rate | Reason |
|----------|-------------|--------|
| `/unsafe/{id}` | ~30-60% ❌ | Race conditions |
| `/safe-prototype/{id}` | ~99%+ ✅ | Each request gets its own instance |
| `/safe-singleton/{id}` | ~99%+ ✅ | No shared mutable state |

**Example failure from unsafe endpoint:**
```
Request: /unsafe/42
Expected: "42"
Got: "87"  ← Race condition!
```

## Requirements

- **Java:** 21 or higher
- **Maven:** 3.8.0 or higher
- **Spring Boot:** 3.3.4
- **K6:** 0.50.0 or higher

## Project Structure

```
springboot-web/
├── pom.xml
├── README.md
├── run-demo.sh
├── k6/
│   ├── sequential-test.js
│   └── concurrent-test.js
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/example/threadsafety/
    │   │       ├── ThreadSafetyDemoApplication.java
    │   │       └── controller/
    │   │           ├── UnsafeController.java
    │   │           ├── SafePrototypeController.java
    │   │           └── SafeSingletonController.java
    │   └── resources/
    │       └── application.properties
    └── test/
```

## API Endpoints

### Unsafe Endpoint
```bash
# Default timeout (100ms)
curl http://localhost:8080/unsafe/123

# Custom timeout (500ms)
curl http://localhost:8080/unsafe/123/500
```

### Safe Prototype Endpoint
```bash
# Default timeout (100ms)
curl http://localhost:8080/safe-prototype/123

# Custom timeout (250ms)
curl http://localhost:8080/safe-prototype/123/250
```

### Safe Singleton Endpoint
```bash
# Default timeout (100ms)
curl http://localhost:8080/safe-singleton/123

# Custom timeout (1000ms)
curl http://localhost:8080/safe-singleton/123/1000
```

## Configurable Timeout

All endpoints support an optional timeout parameter to control the simulated processing delay:

### Usage

```bash
# Default timeout: 100ms
GET /{endpoint}/{id}

# Custom timeout: N milliseconds
GET /{endpoint}/{id}/{timeout}
```

### Examples

```bash
# Faster response (10ms delay)
curl http://localhost:8080/unsafe/42/10

# Longer delay to amplify race conditions (500ms)
curl http://localhost:8080/unsafe/42/500

# Very long delay for demonstration (5 seconds)
curl http://localhost:8080/safe-singleton/123/5000
```

### Use Cases

1. **Testing Race Conditions**: Longer timeouts (200-1000ms) make race conditions in `/unsafe` more observable
2. **Performance Testing**: Shorter timeouts (10-50ms) for faster load test iterations
3. **Demonstration**: Very long timeouts (5000ms+) to clearly show concurrent request handling

### Response

The timeout value used is included in the response for verification.

### Backward Compatibility

Existing clients using `/{endpoint}/{id}` format continue to work with the default 100ms timeout. No changes required to existing tests or scripts.

## Key Takeaways

1. **Singleton controllers are shared:** All requests use the same instance
2. **Private fields cause race conditions:** Don't store request data in fields
3. **Use method parameters:** They are thread-local and safe
4. **Prototype scope works but is inefficient:** Creating new instances per request wastes resources
5. **Best practice:** Keep singleton scope but avoid mutable request-specific state in fields

## References

- [Spring Framework: Bean Scopes](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#beans-factory-scopes)
- [Spring Web: Handler Methods](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#mvc-controller)
- [Java Thread Safety Guide](https://docs.oracle.com/javase/tutorial/essential/concurrency/)

## License

For training purposes only. Not production code.
