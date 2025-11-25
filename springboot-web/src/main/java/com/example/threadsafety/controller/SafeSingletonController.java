package com.example.threadsafety.controller;

import org.springframework.web.bind.annotation.*;

/**
 * THREAD-SAFE Controller (Solution 2: Singleton Scope - BEST PRACTICE)
 *
 * This controller is singleton-scoped (default) but achieves thread safety
 * by NOT storing request-specific data in private fields.
 *
 * BEST PRACTICE: Use method parameters and local variables for request data.
 * Private/instance fields should only be used for shared, immutable resources
 * like dependencies.
 *
 * ADVANTAGE: Singleton scope is more efficient (one instance for all requests)
 * while maintaining thread safety.
 */
@RestController
@RequestMapping("/safe-singleton")
public class SafeSingletonController {

    // NO private fields for request-specific data!
    // This controller is singleton, so we avoid storing request state here.
    // Any shared dependencies should be injected and be thread-safe.

    @GetMapping({"/{id}", "/{id}/{timeout}"})
    public String get(
            @PathVariable String id,
            @PathVariable(required = false) Long timeout
    ) {
        // Determine effective timeout (default: 100ms)
        long effectiveTimeout = (timeout != null) ? timeout : 100L;

        // Use method parameter directly (thread-local, safe)
        // No need to store in a private field

        // Simulate some processing time
        try {
            Thread.sleep(effectiveTimeout);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Retrieve from method parameter (never changes during request)
        String retrievedId = id;

        return retrievedId + "\n";
    }
}
