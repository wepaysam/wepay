const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config({ path: './.env.local' });

// --- Configuration ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || '').split(',').filter(id => id);
const BALANCE_CHECK_INTERVAL_MS = parseInt(process.env.BALANCE_CHECK_INTERVAL_MS) || 300000; // 5 minutes
const LOW_BALANCE_THRESHOLD = 300000;
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const AERONPAY_BALANCE_API = `${API_BASE_URL}/api/aeronpay/balance`;
const BOT_PASSWORD = process.env.TELEGRAM_BOT_PASSWORD || 'i am lolu';

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 30000; // 30 seconds

// --- Authentication State ---
const authenticatedUsers = new Set();

// --- Bot Initialization ---
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// --- Helper Functions ---
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level.padEnd(7)}] ${message}${logData}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getAeronPayBalance = async (retryCount = 0) => {
  try {
    const response = await axios.post(AERONPAY_BALANCE_API, {}, {
      timeout: 10000 // 10 second timeout
    });
    return response.data;
  } catch (error) {
    const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET';
    
    if (isConnectionError && retryCount < MAX_RETRIES) {
      const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
      log('WARN', `Connection failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`, { 
        error: error.message,
        code: error.code 
      });
      await sleep(delay);
      return getAeronPayBalance(retryCount + 1);
    }
    
    log('ERROR', 'Failed to fetch AeronPay balance', { 
      error: error.message,
      code: error.code,
      retries: retryCount
    });
    return null;
  }
};

const checkLowBalance = async () => {
  log('INFO', 'Checking AeronPay balance...');
  const balanceData = await getAeronPayBalance();

  if (!balanceData) {
    log('WARN', 'Could not retrieve balance, will retry on next scheduled check');
    return;
  }

  log('INFO', 'Balance data received', { balanceData });

  // Handle different possible response formats from AeronPay API
  const balance = balanceData.available_balance ?? balanceData.balance ?? balanceData.data?.balance ?? balanceData.amount;
  
  if (balance === undefined || balance === null) {
    log('ERROR', 'Balance property not found in response', { balanceData });
    return;
  }

  if (balance < LOW_BALANCE_THRESHOLD) {
    const message = `🚨 *Low Balance Alert!* 🚨\n\nAeronPay balance is critically low.\n\n*Current Balance:* ₹${balance.toLocaleString()}\n*Threshold:* ₹${LOW_BALANCE_THRESHOLD.toLocaleString()}`;
    CHAT_IDS.forEach(chatId => {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(err => {
        log('ERROR', 'Failed to send message to chat', { chatId, error: err.message });
      });
    });
    log('WARN', 'Low balance notification sent', { balance, notified: CHAT_IDS });
  } else {
    log('INFO', 'Balance is sufficient', { balance });
  }
};

// Wait for Next.js to be ready
const waitForServer = async () => {
  log('INFO', 'Waiting for Next.js server to be ready...');
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await axios.get(API_BASE_URL, { timeout: 5000 });
      log('INFO', 'Next.js server is ready!');
      return true;
    } catch (error) {
      const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, i), MAX_RETRY_DELAY);
      log('INFO', `Server not ready yet, waiting ${delay}ms... (attempt ${i + 1}/${MAX_RETRIES})`);
      await sleep(delay);
    }
  }
  
  log('WARN', 'Server may not be ready, but continuing anyway...');
  return false;
};

// --- Message Handler ---
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  log('INFO', 'Message received', { chatId: chatId.toString(), text, authorizedChats: CHAT_IDS });

  // Ignore messages from unauthorized users
  if (!CHAT_IDS.includes(chatId.toString())) {
    log('WARN', 'Unauthorized message received and ignored', { chatId: chatId.toString() });
    bot.sendMessage(chatId, '🚫 Unauthorized. Your chat ID is: ' + chatId.toString());
    return;
  }

  if (text === '/start' || text === '/help') {
    const response = `Welcome to the WePay Bot!\n\nHere are the available commands:\n- \`/login <password>\`: Authenticate to use protected commands.\n- \`/balance\`: Check the current AeronPay balance (requires authentication).\n- \`/help\`: Show this message again.`;
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
  } else if (text.startsWith('/login ')) {
    const password = text.substring(7).trim(); // Remove '/login ' and trim whitespace
    log('INFO', 'Login attempt', { chatId: chatId.toString(), providedPassword: password, expectedPassword: BOT_PASSWORD });
    if (password === BOT_PASSWORD) {
      authenticatedUsers.add(chatId);
      bot.sendMessage(chatId, '✅ Authentication successful! You can now use the /balance command.');
      log('INFO', 'User authenticated successfully', { chatId });
    } else {
      bot.sendMessage(chatId, '❌ Authentication failed. Incorrect password.');
      log('WARN', 'Failed authentication attempt', { chatId });
    }
  } else if (text === '/balance') {
    if (!authenticatedUsers.has(chatId)) {
      bot.sendMessage(chatId, '🔒 This command requires authentication. Please use `/login <password>` first.', { parse_mode: 'Markdown' });
      return;
    }

    bot.sendMessage(chatId, '⏳ Fetching balance...');
    const balanceData = await getAeronPayBalance();
    
    if (!balanceData) {
      bot.sendMessage(chatId, '❌ Could not retrieve balance. The server may be temporarily unavailable. Please try again later.');
      return;
    }

    log('INFO', 'Balance data for user request', { balanceData });

    // Handle different possible response formats from AeronPay API
    const balance = balanceData.available_balance ?? balanceData.balance ?? balanceData.data?.balance ?? balanceData.amount;
    
    if (balance === undefined || balance === null) {
      log('ERROR', 'Balance property not found in API response', { balanceData });
      bot.sendMessage(chatId, '❌ Error: Could not find balance in API response. Please check server logs.');
      return;
    }

    const message = `*AeronPay Balance:*\n\n💰 ₹${balance.toLocaleString()}`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
});

// --- Error Handlers ---
bot.on('polling_error', (error) => {
  log('ERROR', 'Telegram polling error', { error: error.message });
});

process.on('SIGTERM', () => {
  log('INFO', 'Received SIGTERM, shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('INFO', 'Received SIGINT, shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});

// --- Main Execution ---
const main = async () => {
  log('INFO', 'Starting Telegram Bot...');

  if (TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || CHAT_IDS.length === 0) {
    log('ERROR', 'Telegram Bot Token or Chat IDs are not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS in your .env.local file.');
    return;
  }

  // Wait for Next.js to be ready before doing initial check
  await waitForServer();

  // Initial check
  await checkLowBalance();

  // Set up recurring check
  setInterval(checkLowBalance, BALANCE_CHECK_INTERVAL_MS);

  log('INFO', `Telegram Bot is running and will check balance every ${BALANCE_CHECK_INTERVAL_MS / 1000} seconds.`);
};

main();