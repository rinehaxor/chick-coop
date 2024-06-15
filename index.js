const axios = require('axios');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Function to read tokens from a file and trim any extra spaces
function readTokensFromFile(filePath) {
   return fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .map((token) => token.trim())
      .filter(Boolean);
}

const tokens = readTokensFromFile(path.join(__dirname, 'tokens.txt')); // Path to your tokens file
const headersTemplate = {
   Accept: '*/*',
   'Accept-Encoding': 'gzip, deflate, br, zstd',
   'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
   'Content-Type': 'application/json',
   Origin: 'https://game.chickcoop.io',
   Referer: 'https://game.chickcoop.io/',
   'Sec-Ch-Ua': '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24", "Microsoft Edge WebView2";v="125"',
   'Sec-Ch-Ua-Mobile': '?0',
   'Sec-Ch-Ua-Platform': '"Windows"',
   'Sec-Fetch-Dest': 'empty',
   'Sec-Fetch-Mode': 'cors',
   'Sec-Fetch-Site': 'same-site',
   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
};

const hatchUrl = 'https://api.chickcoop.io/hatch/manual';
const sellEggsUrl = 'https://api.chickcoop.io/user/sell-eggs';
const researchUrl = 'https://api.chickcoop.io/laboratory/research';

const sellEggsPayload = {
   numberOfEggs: 200,
};

const researchPayloads = [{ researchType: 'laboratory.regular.eggValue' }, { researchType: 'laboratory.regular.layingRate' }, { researchType: 'laboratory.regular.farmCapacity' }];

function postRequest(token, accountNumber) {
   const headers = {
      ...headersTemplate,
      Authorization: token,
   };

   axios
      .post(hatchUrl, null, { headers })
      .then((response) => {
         const { ok, data } = response.data;
         if (ok) {
            const chickenQuantity = data.chickens.quantity;
            const eggQuantity = data.eggs.quantity;
            console.log(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Hatch Successful! Chickens: ${chickenQuantity}, Eggs: ${data.eggs.quantity}`);

            if (eggQuantity >= 200) {
               sellEggs(token, accountNumber);
            } else {
               setTimeout(() => postRequest(token, accountNumber), 3000); // Retry every minute
            }
         } else {
            console.log(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Error in hatching`);
            setTimeout(() => postRequest(token, accountNumber), 3000); // Retry every minute
         }
      })
      .catch((error) => {
         console.error(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Error:`, error);
         setTimeout(() => postRequest(token, accountNumber), 3000); // Retry every minute in case of error
      });
}

function sellEggs(token, accountNumber) {
   const headers = {
      ...headersTemplate,
      Authorization: token,
   };

   axios
      .post(sellEggsUrl, sellEggsPayload, { headers })
      .then((response) => {
         const { ok, data } = response.data;
         if (ok) {
            console.log(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Sold Eggs Successfully! New Cash: ${data.cash}`);
         } else {
            console.log(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Error in selling eggs`);
         }
         setTimeout(() => postRequest(token, accountNumber), 3000); // Retry every minute
      })
      .catch((error) => {
         console.error(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Error in selling eggs:`, error);
         setTimeout(() => postRequest(token, accountNumber), 3000); // Retry every minute in case of error
      });
}

function upgradeResearch(token, accountNumber, index = 0) {
   if (index >= researchPayloads.length) {
      console.log(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] All research upgrades attempted and failed.`);
      return;
   }

   const headers = {
      ...headersTemplate,
      Authorization: token,
   };

   axios
      .post(researchUrl, researchPayloads[index], { headers })
      .then((response) => {
         const { ok, data } = response.data;
         if (ok) {
            console.log(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Research Upgrade Successful! Data:`, data);
         } else {
            console.log(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Error in research upgrade`);
            upgradeResearch(token, accountNumber, index + 1);
         }
      })
      .catch((error) => {
         console.error(`[ ${moment().format('HH:mm:ss')} ] [Account ${accountNumber}] Error in research upgrade:`, error);
         upgradeResearch(token, accountNumber, index + 1);
      });
}

// Start the automated process for each token with a delay of 1 second between each account
tokens.forEach((token, index) => {
   const accountNumber = index + 1;
   setTimeout(() => {
      postRequest(token, accountNumber);
      setInterval(() => upgradeResearch(token, accountNumber), 300000); // Upgrade research every 5 minutes for each token
   }, index * 1000); // Delay of 1 second between each account
});
