// scripts/trigger-cron.js
const axios = require('axios');
require('dotenv').config({ path: './.env.local' });

// Configuration with validation
const CRON_ROUTE = '/api/cron/check-pending-transactions';
const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const INTERVAL_MS = parseInt(process.env.CRON_INTERVAL_MS) || 10000;
const MAX_CONSECUTIVE_FAILURES = parseInt(process.env.MAX_CONSECUTIVE_FAILURES) || 5;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000;

// Runtime state
let intervalId = null;
let consecutiveFailures = 0;
let totalRequests = 0;
let successfulRequests = 0;
let isShuttingDown = false;

// Validation
function validateConfig() {
  const errors = [];
  
  if (!CRON_SECRET_KEY) {
    errors.push('CRON_SECRET_KEY is required');
  }
  
  if (CRON_SECRET_KEY && CRON_SECRET_KEY.length < 32) {
    errors.push('CRON_SECRET_KEY should be at least 32 characters');
  }
  
  if (!BASE_URL.startsWith('https://') && !BASE_URL.includes('localhost')) {
    errors.push('BASE_URL should use HTTPS in production');
  }
  
  if (INTERVAL_MS < 5000) {
    errors.push('INTERVAL_MS should be at least 5000ms to avoid overwhelming the server');
  }
  
  return errors;
}

// Enhanced logging with levels
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level.padEnd(5)}] ${message}${logData}`);
}

async function triggerCronJob() {
  if (isShuttingDown) return false;
  
  totalRequests++;
  const url = `${BASE_URL}${CRON_ROUTE}`;
  
  log('INFO', `Triggering cron job (${totalRequests})`, { url });

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET_KEY}`,
        'X-Internal-Cron-Request': 'true',
        'Content-Type': 'application/json',
        'User-Agent': 'CronTrigger/1.0'
      },
      timeout: REQUEST_TIMEOUT,
      validateStatus: function (status) {
        // Don't throw for any status code, we'll handle it ourselves
        return true;
      }
    });

    if (response.status >= 200 && response.status < 300) {
      consecutiveFailures = 0; // Reset failure counter
      successfulRequests++;
      log('SUCCESS', 'Cron job completed', { 
        status: response.status,
        successRate: `${((successfulRequests / totalRequests) * 100).toFixed(1)}%`
      });
      return true;
    } else {
      consecutiveFailures++;
      log('ERROR', `Cron job failed`, { 
        status: response.status,
        consecutiveFailures,
        response: response.data
      });
      
      // Stop if too many consecutive failures
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        log('FATAL', `Stopping after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
        await gracefulShutdown('MAX_FAILURES');
        return false;
      }
      
      return false;
    }
  } catch (error) {
    consecutiveFailures++;
    
    if (error.code === 'ECONNABORTED') {
      log('ERROR', 'Request timed out', { timeout: REQUEST_TIMEOUT, consecutiveFailures });
    } else if (error.code === 'ECONNREFUSED') {
      log('ERROR', 'Connection refused - server may be down', { consecutiveFailures });
    } else if (error.code === 'ENOTFOUND') {
      log('ERROR', 'DNS resolution failed - check BASE_URL', { url, consecutiveFailures });
    } else if (error.response) {
      // Server responded with error status
      log('ERROR', 'Server error response', { 
        status: error.response.status,
        data: error.response.data,
        consecutiveFailures
      });
    } else {
      log('ERROR', 'Network error', { 
        message: error.message,
        code: error.code,
        consecutiveFailures
      });
    }
    
    // Stop if too many consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      log('FATAL', `Stopping after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      await gracefulShutdown('MAX_FAILURES');
      return false;
    }
    
    return false;
  }
}

// Enhanced graceful shutdown
async function gracefulShutdown(reason) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  log('INFO', `Initiating graceful shutdown`, { reason });
  
  if (intervalId) {
    clearInterval(intervalId);
    log('INFO', 'Interval cleared');
  }
  
  // Print final stats
  log('INFO', 'Final statistics', {
    totalRequests,
    successfulRequests,
    failureRate: `${(((totalRequests - successfulRequests) / totalRequests) * 100).toFixed(1)}%`,
    uptime: process.uptime()
  });
  
  process.exit(reason === 'MAX_FAILURES' ? 1 : 0);
}

// Setup signal handlers
function setupSignalHandlers() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  
  signals.forEach(signal => {
    process.on(signal, () => gracefulShutdown(signal));
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log('FATAL', 'Uncaught exception', { error: error.message, stack: error.stack });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason) => {
    log('FATAL', 'Unhandled rejection', { reason });
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}

// Health check endpoint simulation (for monitoring)
function logHealthStatus() {
  const healthStatus = {
    status: consecutiveFailures < 3 ? 'healthy' : 'degraded',
    consecutiveFailures,
    successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
  
  log('HEALTH', 'Health check', healthStatus);
}

// Main execution
(async () => {
  // Validate configuration
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.error('❌ Configuration errors:');
    configErrors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  log('INFO', 'Starting cron trigger service', {
    target: `${BASE_URL}${CRON_ROUTE}`,
    interval: `${INTERVAL_MS}ms`,
    maxFailures: MAX_CONSECUTIVE_FAILURES,
    timeout: REQUEST_TIMEOUT,
    nodeVersion: process.version,
    platform: process.platform
  });
  
  setupSignalHandlers();
  
  // Initial run
  await triggerCronJob();
  
  // Setup recurring execution
  intervalId = setInterval(async () => {
    await triggerCronJob();
  }, INTERVAL_MS);
  
  // Setup health logging (every 5 minutes)
  setInterval(logHealthStatus, 5 * 60 * 1000);
  
  log('INFO', 'Cron trigger service is running. Send SIGTERM or SIGINT to stop gracefully.');
})();