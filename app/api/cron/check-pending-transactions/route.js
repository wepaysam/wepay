import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma'; // Adjust path as needed

const JOB_NAME = 'pending_transaction_status_check';
const LOCK_TIMEOUT_SECONDS = 60; // Lock expires after 60 seconds
const MAX_RETRIES = 3; // Max retries for internal API calls
const RETRY_DELAY_MS = 1000; // 1 second delay between retries

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request) { // Using GET for simplicity, POST is also an option
  // --- Security Check (IMPORTANT!) ---
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    console.warn('Unauthorized access attempt to cron job.');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  // --- End Security Check ---

  let lock = null; // Initialize lock outside try block for finally access

  try {
    // --- Concurrency Control: Acquire Lock ---
    lock = await prisma.cronLock.findUnique({
      where: { jobName: JOB_NAME },
    });

    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_SECONDS * 1000);

    if (lock && lock.isLocked && lock.lockedAt > timeoutThreshold) {
      console.warn(`Cron job ${JOB_NAME} is already locked or recently ran. Skipping this run.`);
      return NextResponse.json({ message: `Cron job ${JOB_NAME} is already locked or recently ran. Skipping.` }, { status: 200 });
    }

    // Acquire or update lock
    lock = await prisma.cronLock.upsert({
      where: { jobName: JOB_NAME },
      update: {
        isLocked: true,
        lockedAt: now,
        lockedBy: 'cron_system', // Or request.headers.get('User-Agent') or instance ID
      },
      create: {
        jobName: JOB_NAME,
        isLocked: true,
        lockedAt: now,
        lockedBy: 'cron_system',
      },
    });
    console.log(`Cron job ${JOB_NAME} lock acquired.`);
    // --- End Concurrency Control ---

    console.log('Starting scheduled pending transaction status check...');

    const PENDING_AGE_THRESHOLD_MINUTES = 5;
    const SEARCH_WINDOW_HOURS = 24; // Only search transactions from last 24 hours

    // Calculate time boundaries
    const ageThreshold = new Date(now.getTime() - PENDING_AGE_THRESHOLD_MINUTES * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - SEARCH_WINDOW_HOURS * 60 * 60 * 1000);

    const pendingTransactions = await prisma.transactions.findMany({
      where: {
        transactionStatus: 'PENDING',
        createdAt: {
          gte: twentyFourHoursAgo, // Only transactions from last 24 hours
          lt: ageThreshold, // Only fetch transactions created before the threshold (older than 5 min)
        },
      },
      take: 50, // Process 50 transactions per run
      orderBy: {
        createdAt: 'desc', // Process newer transactions first
      },
    });

    if (pendingTransactions.length === 0) {
      console.log('No pending transactions found to check in the last 24 hours.');
      return NextResponse.json({ 
        message: 'No pending transactions found in the last 24 hours.',
        searchWindow: `${SEARCH_WINDOW_HOURS} hours`,
        ageThreshold: `${PENDING_AGE_THRESHOLD_MINUTES} minutes`
      });
    }

    console.log(`Found ${pendingTransactions.length} pending transactions from the last 24 hours.`);

    // Log the time range for debugging
    console.log(`Search range: ${twentyFourHoursAgo.toISOString()} to ${ageThreshold.toISOString()}`);

    for (const txn of pendingTransactions) {
      try {
        let statusCheckApiUrl = '';
        let payload = {
          unique_id: txn.referenceNo, // Assuming referenceNo is the unique_id for status checks
          id: txn.id,
          gateway: txn.gateway,
        };

        // Determine which status check API to call based on gateway
        if (txn.gateway === 'DMT') {
          statusCheckApiUrl = `${request.nextUrl.origin}/api/dmt/status`;
        } else if (txn.gateway === 'AeronPay' || txn.gateway === 'UPI') { // Combine AeronPay and UPI
          statusCheckApiUrl = `${request.nextUrl.origin}/api/aeronpay/check-status`;
        } else if (txn.gateway && (txn.gateway.startsWith('sevapay_') || txn.gateway === 'IMPS')) {
          statusCheckApiUrl = `${request.nextUrl.origin}/api/sevapay/status`;
        } else {
          console.warn(`Unknown or unhandled gateway for transaction ${txn.id}: ${txn.gateway}. Skipping status check.`);
          continue; // Skip to next transaction
        }

        let response;
        let lastError = null;
        for (let i = 0; i < MAX_RETRIES; i++) {
          try {
            response = await fetch(statusCheckApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-Cron-Request': 'true',
                'X-Cron-Secret': process.env.CRON_SECRET_KEY,
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              break; // Success, exit retry loop
            } else {
              lastError = `Internal API returned error. Status: ${response.status}`;
              console.warn(`Retry ${i + 1}/${MAX_RETRIES} for transaction ${txn.id} (${txn.gateway}): ${lastError}`);
              await delay(RETRY_DELAY_MS * (i + 1)); // Exponential backoff
            }
          } catch (fetchError) {
            lastError = `Network error: ${fetchError.message}`;
            console.warn(`Retry ${i + 1}/${MAX_RETRIES} for transaction ${txn.id} (${txn.gateway}): ${lastError}`);
            await delay(RETRY_DELAY_MS * (i + 1)); // Exponential backoff
          }
        }

        if (!response || !response.ok) {
          console.error(`Failed to check status for transaction ${txn.id} (${txn.gateway}) after ${MAX_RETRIES} retries. Last error:`, lastError);
          continue; // Move to next transaction
        }

        const result = await response.json();

        console.log(`Status check for transaction ${txn.id} (${txn.gateway}) successful. Result:`, result);
      } catch (error) {
        console.error(`Error processing transaction ${txn.id} in scheduler:`, error);
      }
    }

    console.log('Finished scheduled pending transaction status check.');
    return NextResponse.json({ 
      message: 'Scheduled status check completed.',
      processedCount: pendingTransactions.length,
      searchWindow: `${SEARCH_WINDOW_HOURS} hours`,
      ageThreshold: `${PENDING_AGE_THRESHOLD_MINUTES} minutes`
    });

  } catch (error) {
    console.error('Global error in scheduled status check:', error);
    return NextResponse.json(
      { message: 'Internal server error during scheduled status check', error: error.message },
      { status: 500 }
    );
  } finally {
    // --- Concurrency Control: Release Lock ---
    if (lock && lock.isLocked) {
      await prisma.cronLock.update({
        where: { id: lock.id },
        data: {
          isLocked: false,
          lockedAt: null, // Clear lockedAt when released
          lockedBy: null,
        },
      });
      console.log(`Cron job ${JOB_NAME} lock released.`);
    }
    // --- End Concurrency Control ---
  }
}