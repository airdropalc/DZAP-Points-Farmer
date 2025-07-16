const readline = require('readline');
const fs = require('fs');
const log = require('./logger');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function checkAndSetupConfiguration() {
    let needsSetup = false;
    if (!fs.existsSync('.env')) {
        log.warn(".env file not found. Starting configuration mode.");
        needsSetup = true;
    } else {
        const answer = await question(".env configuration file already exists. Do you want to reconfigure? (y/n): ");
        if (answer.toLowerCase() === 'y') {
            needsSetup = true;
        } else {
            log.success("Using existing configuration.");
        }
    }

    if (needsSetup) {
        await configureEnv();
        await configureProxy();
    }

    rl.close();
}

async function configureEnv() {
    log.step("PRIVATE KEY CONFIGURATION");
    const privateKeys = await question("Enter your PRIVATE_KEY(s) (PRIVATE_KEY1,PRIVATE_KEY2PRIVATE_KEY3): ");
    
    if (!privateKeys || privateKeys.trim() === '') {
        log.error("PRIVATE_KEY cannot be empty. Aborting.");
        process.exit(1);
    }

    fs.writeFileSync('.env', `PRIVATE_KEY=${privateKeys.trim()}\n`);
    log.success("Successfully created .env file with your PRIVATE_KEY.");
}

async function configureProxy() {
    log.step("PROXY CONFIGURATION");
    const useProxies = await question("Do you want to use proxies? (y/n): ");

    if (useProxies.toLowerCase() !== 'y') {
        log.info("Skipping proxy configuration.");
        return;
    }

    const proxies = [];
    log.info("Enter your proxies one by one. Press Enter on an empty line to finish.");
    
    while (true) {
        const proxyInput = await question(`> Enter proxy (format: http://user:pass@ip:port): `);
        if (proxyInput.trim() === '') {
            break;
        }
        proxies.push(proxyInput.trim());
    }

    if (proxies.length > 0) {
        fs.writeFileSync('proxy.txt', proxies.join('\n') + '\n');
        log.success(`Successfully created proxy.txt with ${proxies.length} proxies.`);
    } else {
        log.warn("No proxies were added.");
        if (fs.existsSync('proxy.txt')) {
            fs.writeFileSync('proxy.txt', '');
        }
    }
}

module.exports = { checkAndSetupConfiguration };