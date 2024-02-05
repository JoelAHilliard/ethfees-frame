import express from 'express';
// If you were using fs and path, here's how you'd import them in ES Module syntax, but since they're commented out, I'll leave them as a note.
// import fs from 'fs/promises';
// import path from 'path';
import { getFrameMessage } from '@coinbase/onchainkit';
import satori from 'satori';
// import sanitizeHtml from 'sanitize-html'; // Assuming you might need it later based on your commented code.
import sharp from 'sharp';


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/png', async (req, res) => {
    // Extract dynamic data from query parameters
    const message = 'Hello, World!';
    const options ={
        height:600,
        width:900
    }
    let svg_test = await satori(
        {
          type: 'div',
          props: {
            children: 'hello, world',
            style: { color: 'black' },
          },
        },
        options
      )
    // Manually construct an SVG string
    const svgData = `
        <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
            <style>
                @font-face {
                    font-family: 'MyCustomFont';
                    src: url('opensans.ttf');
                }
                .custom-text {
                    font-family: 'MyCustomFont', sans-serif;
                    font-size: 24px;
                }
            </style>
            <rect width="100%" height="100%" fill="green"/>
            <text x="10" y="50" class="custom-text">Hello, SVG with Custom Font!</text>
        </svg>
    `;

    try {
        // Convert SVG string to PNG buffer using sharp
        const pngBuffer = await sharp(Buffer.from(svg_test))
                                .resize(800) // Resize if needed, though this might distort the image if the aspect ratio changes
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
                    <meta property="fc:frame:image" content="https://ethfees-frame-production.up.railway.app/png?message=Hello" />
                    <meta property="og:image" content="https://ethfees-frame-production.up.railway.app/png?message=Hello" />
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