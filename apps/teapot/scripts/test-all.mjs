#!/usr/bin/env node
/**
 * Test Runner Script
 * Runs migrations, starts dev server, and executes all tests
 */

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const API_BASE = 'http://localhost:3000';
const SERVER_STARTUP_TIMEOUT = 30000;
const HEALTH_CHECK_INTERVAL = 1000;

let serverProcess = null;

async function log(message) {
    console.log(`\x1B[36m[test-runner]\x1B[0m ${message}`);
}

async function error(message) {
    console.error(`\x1B[31m[test-runner]\x1B[0m ${message}`);
}

async function success(message) {
    console.log(`\x1B[32m[test-runner]\x1B[0m ${message}`);
}

async function isServerRunning() {
    try {
        const response = await fetch(`${API_BASE}/_health`, { method: 'GET' });
        return response.ok || response.status < 500;
    }
    catch {
        return false;
    }
}

async function waitForServer(timeout = SERVER_STARTUP_TIMEOUT) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await isServerRunning()) {
            return true;
        }
        await new Promise(r => setTimeout(r, HEALTH_CHECK_INTERVAL));
    }
    return false;
}

async function startServer() {
    log('Starting dev server...');

    serverProcess = spawn('bun', ['run', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        detached: false,
    });

    serverProcess.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line)
            console.log(`  [server] ${line}`);
    });

    serverProcess.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line)
            console.log(`  [server] ${line}`);
    });

    const ready = await waitForServer();
    if (!ready) {
        throw new Error('Server failed to start within timeout');
    }

    success('Server is ready!');
}

async function stopServer() {
    if (serverProcess) {
        log('Stopping dev server...');
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
}

async function runCommand(cmd, description) {
    log(`${description}...`);
    try {
        const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() });
        if (stdout)
            console.log(stdout);
        if (stderr)
            console.error(stderr);
        success(`${description} completed`);
        return true;
    }
    catch (e) {
        error(`${description} failed: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log('\n\x1B[1m========================================\x1B[0m');
    console.log('\x1B[1m  Teapot Test Runner\x1B[0m');
    console.log('\x1B[1m========================================\x1B[0m\n');

    let exitCode = 0;
    let serverStartedByUs = false;

    try {
        // Step 1: Start Docker MySQL if needed
        log('Checking Docker MySQL...');
        await runCommand('bun run db:dev', 'Starting Docker MySQL');

        // Step 2: Push schema
        await runCommand('bun run db:push', 'Pushing database schema');

        // Step 3: Check if server is already running
        const serverAlreadyRunning = await isServerRunning();

        if (serverAlreadyRunning) {
            log('Dev server is already running');
        }
        else {
            await startServer();
            serverStartedByUs = true;
        }

        // Step 4: Run unit tests
        console.log('\n\x1B[1m--- Unit Tests ---\x1B[0m\n');
        const unitResult = await runCommand('bun run test', 'Unit tests');
        if (!unitResult)
            exitCode = 1;

        // Step 5: Run integration tests
        console.log('\n\x1B[1m--- Integration Tests ---\x1B[0m\n');
        const integrationResult = await runCommand('bun run test:integration', 'Integration tests');
        if (!integrationResult)
            exitCode = 1;

        // Step 6: Run API tests
        console.log('\n\x1B[1m--- API Tests ---\x1B[0m\n');
        const apiResult = await runCommand('bun run test:api', 'API tests');
        if (!apiResult)
            exitCode = 1;
    }
    catch (e) {
        error(`Fatal error: ${e.message}`);
        exitCode = 1;
    }
    finally {
        // Cleanup
        if (serverStartedByUs) {
            await stopServer();
        }
    }

    console.log('\n\x1B[1m========================================\x1B[0m');
    if (exitCode === 0) {
        success('All tests passed! ✓');
    }
    else {
        error('Some tests failed ✗');
    }
    console.log('\x1B[1m========================================\x1B[0m\n');

    process.exit(exitCode);
}

// Handle interrupts
process.on('SIGINT', async () => {
    log('Interrupted, cleaning up...');
    await stopServer();
    process.exit(1);
});

process.on('SIGTERM', async () => {
    await stopServer();
    process.exit(1);
});

main();
