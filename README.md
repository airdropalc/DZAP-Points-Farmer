# 🤖 DZAP Points Farmer

An automated script designed to farm points on the DZAP platform by performing swaps on the **Base Mainnet**.

If you haven't registered on DZAP yet, you can do so through the official platform.

<a href="data:image/jpeg;base64,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" target="_blank"><img src="https://app.dzap.io/?referral=49189b2A" alt="DZAP Registration Banner"></a>

[![Telegram](https://img.shields.io/badge/Community-Airdrop_ALC-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/airdropalc/2779)

---

## 🚨 EXTREMELY IMPORTANT: MAINNET BOT 🚨

**This is NOT a testnet script. This bot operates on the Base Mainnet and will use REAL funds from your wallet.**

* **You are responsible for all transactions and gas fees.**
* **Understand the risks before proceeding.** Use with extreme caution.
* **Always start with a small amount** to verify that everything is working as you expect.

---

## ✨ Key Features

* **📈 Mainnet Point Farming:** Specifically designed to accumulate points on the DZAP mainnet.
* **📊 Built-in Point Tracker:** The script's output allows you to monitor the points you have earned.
* **🎯 Targeted Swaps:** Focuses exclusively on swapping between **ETH (Base)** and **USDC (Base)** to generate points.
* **👥 Multi-Wallet Support:** Manage and run tasks for multiple wallets simultaneously.
* **🌐 Optional Proxy Integration:** Supports the use of proxies for enhanced privacy.

---

## 🛠️ Installation & Configuration Guide

### Prerequisites
* **Node.js** (version 18 or higher)
* **npm** (usually included with Node.js)

### Step 1: Clone the Repository
Download the project files to your machine and navigate into the main folder.
```bash
git clone [https://github.com/airdropalc/DZAP-Points-Farmer.git](https://github.com/airdropalc/DZAP-Points-Farmer.git)
cd DZAP-Points-Farmer
```

### Step 2: Install Dependencies
Install the required Node.js packages.
```bash
npm install
```
### Step 3: Run the Bot
Start the bot to begin the point farming process. Monitor your terminal to see the transaction outputs and your updated point balance.
```bash
node index.js
```

---

## ⚠️ Additional Security Warning

**This software is provided for educational purposes only. The security of your assets is your responsibility.**

* **Handle Your Private Keys With Extreme Care:** Your private keys grant **complete and irreversible control** over your funds.
* **NEVER share your private keys** or commit your `.env` file to a public GitHub repository.
* The authors and contributors of this project are **not responsible for any form of financial loss**, account compromise, or other damages.

---
> Inspired by and developed for the [Airdrop ALC](https://t.me/airdropalc) community.

## License

![Version](https://img.shields.io/badge/version-1.1.0-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

---
