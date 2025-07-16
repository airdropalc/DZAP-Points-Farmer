const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const log = require('./config/logger');
const { checkAndSetupConfiguration } = require('./config/setup');

async function start() {
    log.scriptInfo("DZAP Points Farmer", "@airdropalc");

    await checkAndSetupConfiguration();

    require('dotenv').config();

    if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.trim() === '') {
        log.error("FATAL: PRIVATE_KEY not found or empty in the .env file.");
        log.error("Please run the script again to configure.");
        process.exit(1);
    }
    
    runBot();
}

async function runBot() {
    const privateKeys = process.env.PRIVATE_KEY.split(',');
    const ALCHEMY_URL = `https://base-mainnet.g.alchemy.com/v2/Onk45xXyTWVFFNDbJvP5R`;
    const ethAmountToSwap = "0.000001";
    const minEthBalance = ethers.parseEther(ethAmountToSwap);
    
    const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const DZAP_SPENDER_ADDRESS = "0xf708e11a7c94abde8f6217b13e6fe39c8b9cc0a6";
    
    const USDC_ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) view returns (uint256)"
    ];
    
    const dzapHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://app.dzap.io',
        'Referer': 'https://app.dzap.io/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    let proxies = [];
    try {
        if (fs.existsSync('proxy.txt')) {
            proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(p => p.trim());
            if (proxies.length > 0) {
                log.success(`Loaded ${proxies.length} proxies from proxy.txt`);
            }
        }
    } catch (error) {
        log.error(`Error reading proxy file: ${error.message}`);
    }
    
    function createAxiosInstance(proxyUrl = null) {
        if (!proxyUrl) return axios.create({ headers: dzapHeaders });
        const parts = proxyUrl.replace('http://', '').split('@');
        const [auth, host] = parts.length > 1 ? parts : [null, parts[0]];
        const [ip, port] = host.split(':');
        
        const config = {
            headers: dzapHeaders,
            proxy: { host: ip, port: parseInt(port), protocol: 'http' }
        };
        
        if (auth) {
            const [user, pass] = auth.split(':');
            config.proxy.auth = { username: user, password: pass };
        }

        return axios.create(config);
    }
    
    function createProvider(proxyUrl = null) {
        if (!proxyUrl) {
            return new ethers.JsonRpcProvider(ALCHEMY_URL);
        }
        const fetchRequest = new ethers.FetchRequest(ALCHEMY_URL);
        fetchRequest.agent = new HttpsProxyAgent(proxyUrl);
        return new ethers.JsonRpcProvider(fetchRequest);
    }
    
    async function makeRequest(method, endpoint, data = null, proxyUrl = null, retries = 3) {
        const axiosInstance = createAxiosInstance(proxyUrl);
        for (let i = 0; i < retries; i++) {
            try {
                const config = {
                    method,
                    url: `https://api.dzap.io/v1${endpoint}`,
                    ...(data && { data }),
                    timeout: 30000
                };
                const response = await axiosInstance(config);
                if (!response.data) throw new Error('Empty response data');
                return response.data;
            } catch (error) {
                if (i === retries - 1) {
                    log.error(`Request failed after ${retries} attempts for ${method} ${endpoint}: ${error.response?.data || error.message}`);
                    throw error;
                }
                log.warn(`Retrying ${method} ${endpoint} (attempt ${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            }
        }
    }
    
    async function sendTransaction(wallet, txRequest, description) {
        try {
            const tx = { to: txRequest.to, data: txRequest.data, value: txRequest.value, gasLimit: txRequest.gasLimit };
            const txResponse = await wallet.sendTransaction(tx);
            log.tx(`${description} sent.`);
            log.explorer(`https://basescan.org/tx/${txResponse.hash}`);
            const receipt = await txResponse.wait();
            log.success(`${description} confirmed in block: ${receipt.blockNumber}`);
            return receipt;
        } catch (error) {
            log.error(`Error sending ${description}: ${error.message}`);
            throw error;
        }
    }
    
    async function calculatePoints(wallet, proxyUrl, swapQuote, srcToken, destToken, srcAmount, srcDecimals, destDecimals) {
        try {
            log.loading("Calculating Swap Points");
            const quoteKey = `${srcToken}-${destToken}`;
            const quoteData = swapQuote[quoteKey]?.quoteRates?.lifi?.data || swapQuote[quoteKey]?.quoteRates?.relayLink?.data;
    
            if (!quoteData || !quoteData.destAmount) {
                log.warn("Could not find destination amount in quote, skipping points calculation.");
                return;
            }
            const destAmount = quoteData.destAmount;
            const payload = {
                account: wallet.address, chainId: 8453,
                destTokens: [{ address: destToken, amount: destAmount, decimals: destDecimals, chainId: 8453 }],
                srcTokens: [{ address: srcToken, amount: srcAmount, decimals: srcDecimals, chainId: 8453 }],
                txType: "swap"
            };
    
            const pointsResponse = await makeRequest('POST', '/user/calculatePoints', payload, proxyUrl);
            log.points(pointsResponse.points);
        } catch (error) {
            log.error(`Failed to calculate points: ${error.message}`);
        }
    }
    
    async function checkEthBalance(wallet) {
        const balance = await wallet.provider.getBalance(wallet.address);
        if (balance < minEthBalance) {
            log.warn(`Insufficient balance for ${wallet.address}: ${ethers.formatEther(balance)} ETH (required: ${ethers.formatEther(minEthBalance)} ETH)`);
            return false;
        }
        return true;
    }
    
    async function processEthToUsdcSwap(wallet, proxyUrl = null) {
        if (proxyUrl) log.info(`Using proxy: ${proxyUrl.split('@')[1] || proxyUrl}`);
    
        try {
            if (!await checkEthBalance(wallet)) return { success: false, reason: 'insufficient_balance' };
    
            log.loading("Logging in and fetching account info");
            const loginResponse = await makeRequest('POST', '/user/login', { account: wallet.address, chainType: "evm", referralCode: null }, proxyUrl);
            let rewardsInfo = {};
            try {
                rewardsInfo = await makeRequest('GET', `/user/rewards-info?account=${wallet.address}&chainType=evm`, null, proxyUrl);
            } catch (e) {
                log.warn("Could not retrieve reward info.");
            }
            log.accountInfo(loginResponse.user?.points, rewardsInfo.rank, loginResponse.user?.referralCode);
    
            log.loading("Getting quote for ETH to USDC");
            const srcAmount = ethers.parseEther(ethAmountToSwap).toString();
            const quotePayload = {
                chainId: 8453,
                data: [{ account: wallet.address, amount: srcAmount, destDecimals: 6, destToken: USDC_ADDRESS, slippage: 0.5, srcDecimals: 18, srcToken: ETH_ADDRESS }],
                integratorId: "dzap", filter: "best"
            };
            const swapQuote = await makeRequest('POST', '/swap/quote', quotePayload, proxyUrl);
            await calculatePoints(wallet, proxyUrl, swapQuote, ETH_ADDRESS, USDC_ADDRESS, srcAmount, 18, 6);
    
            log.loading("Building transaction for ETH to USDC");
            const buildTxPayload = {
                chainId: 8453,
                data: [{ sourceId: "lifi", srcToken: ETH_ADDRESS, amount: srcAmount, destToken: USDC_ADDRESS, destDecimals: 6, srcDecimals: 18, slippage: 0.5, permitData: "0x" }],
                integratorId: "dzap", recipient: wallet.address, refundee: wallet.address, sender: wallet.address
            };
            const builtTx = await makeRequest('POST', '/swap/buildTx', buildTxPayload, proxyUrl);
    
            log.loading("Sending transaction for ETH to USDC");
            const receipt = await sendTransaction(wallet, builtTx.data.transactionRequest, "Swap Transaction ETH to USDC");
            log.success(`Swap ETH to USDC successful for wallet: ${wallet.address}`);
            return { success: true, receipt };
        } catch (error) {
            log.error(`Swap ETH to USDC FAILED for wallet ${wallet.address}: ${error.message}`);
            return { success: false, error };
        }
    }
    
    async function getUsdcBalance(wallet) {
        try {
            const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
            const balance = await usdcContract.balanceOf(wallet.address);
            log.info(`Current USDC balance: ${ethers.formatUnits(balance, 6)} USDC`);
            return balance;
        } catch (error) {
            log.error(`Failed to get USDC balance: ${error.message}`);
            return ethers.toBigInt(0);
        }
    }
    
    async function approveUsdcToken(wallet, amount) {
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
        log.loading(`Approving DZap (${DZAP_SPENDER_ADDRESS}) to spend ${ethers.formatUnits(amount, 6)} USDC`);
        const tx = await usdcContract.approve(DZAP_SPENDER_ADDRESS, amount);
        log.tx(`Approval transaction sent.`);
        log.explorer(`https://basescan.org/tx/${tx.hash}`);
        await tx.wait();
        log.success(`Approval successful!`);
    }
    
    async function processUsdcToEthSwap(wallet, proxyUrl, amountToSwap) {
        const srcAmount = amountToSwap.toString();
        if (ethers.toBigInt(srcAmount) <= 0) {
            log.info("Zero USDC balance, skipping return swap.");
            return { success: true, reason: 'zero_balance' };
        }
        
        log.info(`Starting return swap flow for ${ethers.formatUnits(srcAmount, 6)} USDC to ETH`);
        
        try {
            await approveUsdcToken(wallet, amountToSwap);
            log.info("Waiting 5 seconds for approval to propagate");
            await new Promise(resolve => setTimeout(resolve, 5000));
    
            log.loading("Getting quote for USDC to ETH");
            const quotePayload = {
                chainId: 8453,
                data: [{ account: wallet.address, amount: srcAmount, destDecimals: 18, destToken: ETH_ADDRESS, slippage: 0.5, srcDecimals: 6, srcToken: USDC_ADDRESS }],
                integratorId: "dzap", filter: "best"
            };
            const swapQuote = await makeRequest('POST', '/swap/quote', quotePayload, proxyUrl);
            await calculatePoints(wallet, proxyUrl, swapQuote, USDC_ADDRESS, ETH_ADDRESS, srcAmount, 6, 18);
    
            log.loading("Building transaction for USDC to ETH");
            const buildTxPayload = {
                chainId: 8453,
                data: [{ sourceId: "lifi", srcToken: USDC_ADDRESS, destToken: ETH_ADDRESS, amount: srcAmount, srcDecimals: 6, destDecimals: 18, slippage: 0.5 }],
                integratorId: "dzap", recipient: wallet.address, refundee: wallet.address, sender: wallet.address
            };
            const builtTx = await makeRequest('POST', '/swap/buildTx', buildTxPayload, proxyUrl);
    
            if (builtTx.status !== 'success') throw new Error(`Failed to build transaction: ${builtTx.message || 'Unknown error'}`);
    
            log.loading("Sending transaction for USDC to ETH");
            const receipt = await sendTransaction(wallet, builtTx.data.transactionRequest, "Swap Transaction USDC to ETH");
            log.success(`Swap USDC to ETH successful for wallet: ${wallet.address}`);
            return { success: true, receipt };
        } catch (error) {
            log.error(`Swap USDC to ETH FAILED for wallet ${wallet.address}: ${error.message}`);
            return { success: false, error };
        }
    }
    
    async function mainLoop() {
        let iteration = 1;
        while (true) {
            log.step(`STARTING ITERATION ${iteration} FOR ${privateKeys.length} WALLETS`);
            
            for (let i = 0; i < privateKeys.length; i++) {
                const privateKey = privateKeys[i].trim();
                const proxyUrl = proxies.length > i ? proxies[i].trim() : null;
                const provider = createProvider(proxyUrl);
                const wallet = new ethers.Wallet(privateKey, provider);
                
                log.wallet(`[${i + 1}/${privateKeys.length}] Wallet: ${wallet.address}`);
                log.step("PHASE 1: SWAP ETH to USDC");
                const ethToUsdcResult = await processEthToUsdcSwap(wallet, proxyUrl);
    
                if (ethToUsdcResult.success) {
                    const delayAfterFirstSwap = 20000;
                    log.info(`First swap successful. Waiting ${delayAfterFirstSwap / 1000} seconds before swapping back`);
                    await new Promise(resolve => setTimeout(resolve, delayAfterFirstSwap));
    
                    log.step("PHASE 2: SWAP USDC to ETH");
                    const usdcBalance = await getUsdcBalance(wallet);
                    await processUsdcToEthSwap(wallet, proxyUrl, usdcBalance);
                } else {
                    log.warn(`ETH to USDC swap failed or was skipped. Continuing to next wallet.`);
                }
    
                if (i < privateKeys.length - 1) {
                    const delay = 15000;
                    log.info(`Finished with wallet. Waiting ${delay/1000} seconds before continuing`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            const delayBetweenIterations = 5 * 60 * 1000;
            log.step(`ITERATION ${iteration} COMPLETE`);
            log.info(`Waiting ${delayBetweenIterations / 60000} minutes before starting the next iteration`);
            iteration++;
            await new Promise(resolve => setTimeout(resolve, delayBetweenIterations));
        }
    }

    mainLoop().catch(err => {
        log.error(`A fatal error occurred in the main loop: ${err.message}`);
    });
}

start();