require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const userAgents = require('user-agents');

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`  Goblin Auto Bot - Airdrop Insiders  `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  },
};

const getRandomUserAgent = () => {
  const ua = new userAgents();
  return ua.toString();
};

const getMiningAxiosConfig = (token) => ({
  headers: {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.7',
    'priority': 'u=1, i',
    'sec-ch-ua': getRandomUserAgent(),
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'cookie': `__Secure-next-auth.session-token=${token}`,
    'Referer': 'https://www.goblin.meme/box/6856701d223b22873ed1d730',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
});

const getUserAxiosConfig = (token) => ({
  headers: {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.7',
    'cache-control': 'max-age=0',
    'priority': 'u=0, i',
    'sec-ch-ua': getRandomUserAgent(),
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'sec-gpc': '1',
    'upgrade-insecure-requests': '1',
    'cookie': `__Secure-next-auth.session-token=${token}`,
    'Referer': 'https://twitter.com/',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
});

const fetchUserData = async (token) => {
  try {
    logger.loading('Fetching user data...');
    const response = await axios.get('https://www.goblin.meme/', getUserAxiosConfig(token));
    const $ = cheerio.load(response.data);

    const rankElement = $('.w-16.h-16.bg-lime-400.rounded-full').text().trim().replace('#', '');
    const rank = rankElement ? parseInt(rankElement) : 'N/A';

    const pointsElement = $('.inline-flex.items-center.rounded-md.border.px-2\\.5.py-0\\.5.text-xs').first().text().trim();
    const pointsMatch = pointsElement.match(/(\d+)\s*Total Goblin Points/);
    const totalPoints = pointsMatch ? parseInt(pointsMatch[1]) : 'N/A';

    logger.success(`User Rank: #${rank}`);
    logger.success(`Total Goblin Points: ${totalPoints}`);
    return { rank, totalPoints };
  } catch (error) {
    logger.error(`Failed to fetch user data: ${error.message}`);
    return { rank: 'N/A', totalPoints: 'N/A' };
  }
};

const displayCountdown = (readyAt) => {
  return new Promise((resolve) => {
    const updateCountdown = () => {
      const now = new Date();
      const timeLeft = new Date(readyAt) - now;
      
      if (timeLeft <= 0) {
        logger.success('Mining is ready to start!');
        clearInterval(countdownInterval);
        resolve();
        return;
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      process.stdout.write(`\r${colors.cyan}[⏰] Waiting: ${hours}h ${minutes}m ${seconds}s${colors.reset}   `);
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
  });
};

const checkBoxStatus = async (token) => {
  try {
    logger.loading('Checking box status...');
    const response = await axios.get(
      'https://www.goblin.meme/api/box/6856701d223b22873ed1d730',
      getMiningAxiosConfig(token)
    );
    
    logger.info(`Box Status: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to check box status: ${error.message}`);
    throw error;
  }
};

const startMining = async (token) => {
  try {
    logger.loading('Starting mining...');
    const response = await axios.post(
      'https://www.goblin.meme/api/box/6856701d223b22873ed1d730/start',
      null,
      getMiningAxiosConfig(token)
    );
    
    logger.success(`Mining started: ${response.data.message}`);
    logger.info(`Prize: ${response.data.box.prizeAmount} ${response.data.box.prizeType}`);
    logger.info(`Ready at: ${new Date(response.data.box.readyAt).toLocaleString()}`);
    return response.data.box.readyAt;
  } catch (error) {
    logger.error(`Failed to start mining: ${error.message}`);
    throw error;
  }
};

const main = async () => {
  logger.banner();
  
  const token = process.env.SESSION_TOKEN;
  if (!token) {
    logger.error('SESSION_TOKEN not found in .env file');
    return;
  }

  while (true) {
    try {
      
      await fetchUserData(token);
      
      const boxStatus = await checkBoxStatus(token);
      
      if (boxStatus.isReady) {
        const readyAt = await startMining(token);
        await displayCountdown(readyAt);
      } else {
        logger.warn('Box is not ready yet');
        await displayCountdown(boxStatus.readyAt);
      }
    } catch (error) {
      logger.error('An error occurred, retrying in 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
};

main().catch(console.error);