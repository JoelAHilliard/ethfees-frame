import express from 'express';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import { getFrameMessage } from '@coinbase/onchainkit';
import satori from 'satori';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config();

console.log(process.env.ETHERSCAN_API); 

async function loadFontData(fontPath) {
    try {
      const fontBuffer = await fs.readFile(fontPath);
      return fontBuffer;
    } catch (error) {
      console.error('Error reading font file:', error);
      throw error;
    }
  }
  
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));
const robotoArrayBuffer = await loadFontData('Roboto-Regular.ttf');

const address_cache = {};


function calculateEthSpent(transaction) {
  // Extract gas used and gas price from the transaction object
  const gasUsed = BigInt(transaction.gasUsed);
  const gasPrice = BigInt(transaction.gasPrice);

  // Calculate the total cost in wei
  const totalCostInWei = gasUsed * gasPrice;

  // Convert the total cost from wei to ETH (1 ETH = 1e18 wei)
  const totalCostInEth = Number(totalCostInWei) / 1e18;

  return totalCostInEth;
}
app.get('/png', async (req, res) => {
  const message = (req.query.message || 'default').toLowerCase().trim();
  const cacheKey = message.slice(0, 4) + "..." + message.slice(-4);

  if (cacheKey in address_cache) {
      try {
          const pngBuffer = await sharp(Buffer.from(address_cache[cacheKey]))
                              .resize(1200)
                              .toFormat("png")
                              .toBuffer();
          return res.setHeader('Content-Type', 'image/png').send(pngBuffer);
      } catch (error) {
          console.error('Error processing cached image:', error);
          return res.status(500).send('Internal Server Error');
      }
  }

  const ETHERSCAN_KEY = process.env.ETHERSCAN_API;
  const URL = `https://api.etherscan.io/api?module=account&action=txlist&address=${message}&startblock=0&endblock=99999999&page=1&offset=999&sort=asc&apikey=${ETHERSCAN_KEY}`;

  try {
      const response = await fetch(URL);
      const data = await response.json();

      // Assuming TXs data is processed correctly
      // For simplicity, replace with actual logic as necessary
      const transactions = data.result || [];
      let ethSpent = transactions.reduce((acc, tx) => acc + calculateEthSpent(tx), 0);
      const options = {
        height: 630,
        width: 1200,
        fonts: [
          {
            name: 'Roboto',
            data: robotoArrayBuffer, // Ensure you have the ArrayBuffer of the Roboto font
            weight: 400,
            style: 'normal',
          },
        ],
        };
      // Generate SVG content
      let svgContent = await satori(
        {
          type: 'div',
          props: {
            children: [
              {
                type: 'div',
                props: {
                  children: message.slice(0,4)+"..."+message.slice(message.length-4,message.length) + " spent " + ethSpent.toFixed(2) + "Ξ on " + transactions.length + " transactions.",
                  style: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%', // Use 100% of the container height
                    color: 'white',
                    fontFamily: 'Roboto', // Make sure to match the font family name
                    fontSize: '40px', // Adjust the font size as needed
                  },
                },
              },
            ],
            style: {
              width: '100%', // Use 100% of the width
              height: '100%', // Use 100% of the height
              background: 'linear-gradient(to bottom, #0f172a, #3b0764)', // Set the background to a gradient from purple to black
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            },
          },
        },
        options
      );

      const pngBuffer = await sharp(Buffer.from(svgContent))
                          .resize(1200)
                          .toFormat("png")
                          .toBuffer();

      // Cache the generated PNG content
      address_cache[cacheKey] = pngBuffer;

      res.setHeader('Content-Type', 'image/png');
      res.send(pngBuffer);
  } catch (error) {
      console.error('Error fetching data or generating image:', error);
      res.status(500).send('Internal Server Error');
  }
});



app.post('/hello', async (req, res) => {
    const { body } = req;
    const { isValid, message } = await getFrameMessage(body, {
        neynarApiKey: 'NEYNAR_ONCHAIN_KIT'
    });

    if (isValid) {
        let address = message.interactor.verified_accounts[0];
        // Dynamically construct the SVG URL with query parameters as needed
        const dynamicMessage = encodeURIComponent(address);
        const svgHttpUrl = `https://${req.get('host')}/png?message=${dynamicMessage}`;
        console.log(svgHttpUrl)
        // Return the HTTP link to the dynamically generated SVG in your response
        res.status(200).send(`
            <html>
                <head>
                    <meta property="fc:frame" content="vNext" />
                    <meta property="fc:frame:image" content=${svgHttpUrl} />
                    <meta property="og:image" content=${svgHttpUrl} />
                </head>
                <body>
                </body>
            </html>
        `);
    } else {
        res.status(200).send("No valid or verified accounts found.");
    }
});


app.get('/', (req, res) => {
    res.send('<p>Welcome</p>');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
