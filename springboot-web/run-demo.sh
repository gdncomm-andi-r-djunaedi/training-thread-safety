#!/bin/bash

echo "========================================="
echo "Thread Safety Demo - Automated Run"
echo "========================================="

echo ""
echo "Step 1: Building project..."
mvn clean package -DskipTests

echo ""
echo "Step 2: Starting Spring Boot..."
mvn spring-boot:run &
SPRING_PID=$!

echo ""
echo "Step 3: Waiting 20 seconds for startup..."
sleep 20

echo ""
echo "Step 4: Running sequential test..."
k6 run k6/sequential-test.js

echo ""
echo "Step 5: Running concurrent test..."
k6 run k6/concurrent-test.js

echo ""
echo "Step 6: Stopping Spring Boot..."
kill $SPRING_PID 2>/dev/null || true
wait $SPRING_PID 2>/dev/null || true

# Kill any remaining Java processes (Maven child processes)
killall java 2>/dev/null || true
sleep 2

echo ""
echo "========================================="
echo "Demo complete!"
echo "========================================="
