const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

const log = {
    scriptInfo: (scriptName, creator) => {
        const boxWidth = 45;
        const nameLine = `Script: ${scriptName}`;
        const creatorLine = `Created by: ${creator}`;
        const centeredName = nameLine.padStart(nameLine.length + Math.floor((boxWidth - nameLine.length) / 2), ' ').padEnd(boxWidth, ' ');
        const centeredCreator = creatorLine.padStart(creatorLine.length + Math.floor((boxWidth - creatorLine.length) / 2), ' ').padEnd(boxWidth, ' ');
        
        console.log(`\n${colors.bright}${colors.green}╔═════════════════════════════════════════════╗`);
        console.log(`║ ${centeredName} ║`);
        console.log(`║ ${centeredCreator} ║`);
        console.log(`╚═════════════════════════════════════════════╝${colors.reset}\n`);
    },
    info: (msg) => console.log(`${colors.dim}${colors.white}[INFO] ${msg}${colors.reset}`),
    wallet: (msg) => {
        const paddedMsg = ` ${msg} `;
        const line = '═'.repeat(paddedMsg.length);
        console.log(`\n${colors.bright}${colors.cyan}╔${line}╗`);
        console.log(`║${paddedMsg}║`);
        console.log(`╚${line}╝${colors.reset}`);
    },
    warn: (msg) => console.log(`${colors.bright}${colors.yellow}[WARN] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.bright}${colors.red}[ERROR] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.bright}${colors.green}[SUCCESS] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.magenta}[LOADING] ${msg}${colors.reset}`),
    step: (msg) => console.log(`\n${colors.bright}${colors.yellow}--- ${msg} ---${colors.reset}`),
    tx: (msg) => console.log(`${colors.blue}[TX] ${msg}${colors.reset}`),
    explorer: (msg) => console.log(`${colors.dim}${colors.blue}[VIEW] ${msg}${colors.reset}`),
    accountInfo: (points, rank, code) => {
        points = points || 'N/A';
        rank = rank || 'N/A';
        code = code || 'N/A';
        console.log(`${colors.green}╔═══════════════════════════════════════╗`);
        console.log(`║          DZAP ACCOUNT INFORMATION           ║`);
        console.log(`╠═══════════════════════════════════════╣`);
        console.log(`║ Points: ${points.toString().padEnd(29)} ║`);
        console.log(`║ Rank:   ${rank.toString().padEnd(29)} ║`);
        console.log(`║ Code:   ${code.toString().padEnd(29)} ║`);
        console.log(`╚═══════════════════════════════════════╝${colors.reset}`);
    },
    points: (amount) => {
         log.success(`Points to be earned from this swap: ${amount}`);
    }
};

module.exports = log;