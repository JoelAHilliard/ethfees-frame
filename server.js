const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Assuming Node.js environment, need a fetch polyfill
const { getFrameMessage } = require('@coinbase/onchainkit');
const satori = require('satori');
const sanitizeHtml = require('sanitize-html');
const sharp = require('sharp');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/dynamic-svg', async (req, res) => {
    // Extract dynamic data from query parameters
    const message = 'Hello, World!';
   
    // Manually construct an SVG string
    const svgData = `
        <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
        </svg>
    `;

    try {
        // Convert SVG string to PNG buffer using sharp
        const pngBuffer = await sharp(Buffer.from(svgData))
                                .resize(1200) // Resize if needed, though this might distort the image if the aspect ratio changes
                                .toFormat("png")
                                .toBuffer();

        // Send the PNG buffer as the response
        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
    } catch (error) {
        // Log and send error response if conversion fails
        console.error('Error converting SVG to PNG:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/hello', async (req, res) => {
    const { body } = req;
    const { isValid, message } = await getFrameMessage(body, {
        neynarApiKey: 'NEYNAR_ONCHAIN_KIT'
    });

    if (isValid) {
        // Dynamically construct the SVG URL with query parameters as needed
        const dynamicMessage = encodeURIComponent("Your Dynamic Message Here");
        const svgHttpUrl = `https://${req.get('host')}/dynamic-svg?message=${dynamicMessage}`;
        console.log(svgHttpUrl)
        // Return the HTTP link to the dynamically generated SVG in your response
        res.status(200).send(`
            <html>
                <head>
                    <meta property="fc:frame" content="vNext" />
                    <meta property="fc:frame:image" content="${svgHttpUrl}" />
                    <meta property="og:image" content="${svgHttpUrl}" />
                </head>
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