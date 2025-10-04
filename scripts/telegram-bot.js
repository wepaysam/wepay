const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config({ path: './.env.local' });

// --- Configuration ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || '').split(',').filter(id => id);
const BALANCE_CHECK_INTERVAL_MS = parseInt(process.env.BALANCE_CHECK_INTERVAL_MS) || 300000; // 5 minutes
const LOW_BALANCE_THRESHOLD = 300000;
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const AERONPAY_BALANCE_API = `${API_BASE_URL}/api/aeronpay/balance`;
const BOT_PASSWORD = 'i am lolu';

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

const getAeronPayBalance = async () => {
  try {
    const response = await axios.post(AERONPAY_BALANCE_API);
    return response.data;
  } catch (error) {
    log('ERROR', 'Failed to fetch AeronPay balance', { error: error.message });
    return null;
  }
};

const checkLowBalance = async () => {
  log('INFO', 'Checking AeronPay balance...');
  const balanceData = await getAeronPayBalance();

  if (balanceData && balanceData.balance < LOW_BALANCE_THRESHOLD) {
    const message = `🚨 *Low Balance Alert!* 🚨\n\nAeronPay balance is critically low.\n\n*Current Balance:* ₹${balanceData.balance.toLocaleString()}\n*Threshold:* ₹${LOW_BALANCE_THRESHOLD.toLocaleString()}`;
    CHAT_IDS.forEach(chatId => {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
    log('WARN', 'Low balance notification sent', { balance: balanceData.balance, notified: CHAT_IDS });
  } else if (balanceData) {
    log('INFO', 'Balance is sufficient', { balance: balanceData.balance });
  }
};

// --- Message Handler ---
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignore messages from unauthorized users
  if (!CHAT_IDS.includes(chatId.toString())) {
    log('WARN', 'Unauthorized message received and ignored', { chatId });
    return;
  }

  if (text === '/start' || text === '/help') {
    const response = `\nWelcome to the WePay Bot!\n\nHere are the available commands:\n- \`/login <password>\`: Authenticate to use protected commands.\n- \`/balance\`: Check the current AeronPay balance (requires authentication).\n- \`/help\`: Show this message again.\n    `;
    bot.sendMessage(chatId, response);
  } else if (text.startsWith('/login ')) {
    const password = text.split(' ')[1];
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
      bot.sendMessage(chatId, '🔒 This command requires authentication. Please use \`/login <password>\` first.');
      return;
    }

    const balanceData = await getAeronPayBalance();
    if (balanceData) {
      const message = `*AeronPay Balance:*\n\n💰 ₹${balanceData.balance.toLocaleString()}`;
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, 'Could not retrieve balance. Please check the server logs.');
    }
  }
});

// --- Main Execution ---
const main = () => {
  log('INFO', 'Starting Telegram Bot...');

  if (TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || CHAT_IDS.length === 0) {
    log('ERROR', 'Telegram Bot Token or Chat IDs are not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS in your .env.local file.');
    return;
  }

  // Initial check
  checkLowBalance();

  // Set up recurring check
  setInterval(checkLowBalance, BALANCE_CHECK_INTERVAL_MS);

  log('INFO', 'Telegram Bot is running and will check balance periodically.');
};

main();