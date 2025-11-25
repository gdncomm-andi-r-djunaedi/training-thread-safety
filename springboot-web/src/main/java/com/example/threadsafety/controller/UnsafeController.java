package com.example.threadsafety.controller;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * THREAD-UNSAFE Controller
 *
 * This controller demonstrates the problem of storing request-specific data
 * in private fields of a singleton-scoped Spring controller.
 *
 * With concurrent requests, race conditions occur because all threads share
 * the same 'privateId' field instance.
 */
@RestController
@RequestMapping("/unsafe")
public class UnsafeController {

    // PROBLEM: This private field is shared across ALL requests!
    // Since @RestController is singleton by default, all concurrent requests
    // share the same instance of this field.
    private String privateId;

    @GetMapping({"/{id}", "/{id}/{timeout}"})
    public Map<String, Object> get(
            @PathVariable String id,
            @PathVariable(required = false) Long timeout
    ) {
        // Determine effective timeout (default: 100ms)
        long effectiveTimeout = (timeout != null) ? timeout : 100L;

        // Step 1: Store the id in the private field
        this.privateId = id;

        // Step 2: Simulate some processing time (e.g., database query)
        // This delay makes the race condition more likely to occur
        // Longer timeouts amplify the race condition for easier demonstration
        try {
            Thread.sleep(effectiveTimeout);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Step 3: Retrieve the id from the private field
        // PROBLEM: With concurrent requests, another thread may have changed
        // this.privateId while we were sleeping, so we might return the wrong value!
        String retrievedId = this.privateId;

        return Map.of(
            "id", retrievedId,
            "timeout", effectiveTimeout,
            "scope", "singleton",
            "pattern", "private-field",
            "controller", "UnsafeController",
            "timestamp", System.currentTimeMillis(),
            "thread", Thread.currentThread().getName()
        );
    }
}
