package com.example.threadsafety.controller;

import org.springframework.context.annotation.Scope;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * THREAD-SAFE Controller (Solution 1: Prototype Scope)
 *
 * This controller uses @Scope("prototype") to create a NEW instance
 * for EVERY request. This makes the private field safe because each
 * request thread gets its own instance.
 *
 * TRADE-OFF: This approach creates many controller instances, which
 * consumes more memory and is less efficient than singleton scope.
 */
@RestController
@RequestMapping("/safe-prototype")
@Scope("prototype")  // NEW instance per request!
public class SafePrototypeController {

    // This private field is now SAFE because each request gets a new instance
    // of the entire controller. Different requests cannot interfere with
    // each other's state.
    private String privateId;

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        // Step 1: Store the id in the private field
        this.privateId = id;

        // Step 2: Simulate some processing time
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Step 3: Retrieve the id from the private field
        // SAFE: Since this is a prototype-scoped instance, no other request
        // can access or modify this.privateId. Each request has its own instance.
        String retrievedId = this.privateId;

        return Map.of(
            "id", retrievedId,
            "scope", "prototype",
            "pattern", "private-field",
            "controller", "SafePrototypeController",
            "timestamp", System.currentTimeMillis(),
            "thread", Thread.currentThread().getName(),
            "instanceHashCode", System.identityHashCode(this)
        );
    }
}
