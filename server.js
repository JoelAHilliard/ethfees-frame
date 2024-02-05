import express from 'express';
// If you were using fs and path, here's how you'd import them in ES Module syntax, but since they're commented out, I'll leave them as a note.
import fs from 'fs/promises';
// import path from 'path';
import { getFrameMessage } from '@coinbase/onchainkit';
import satori from 'satori';
// import sanitizeHtml from 'sanitize-html'; // Assuming you might need it later based on your commented code.
import sharp from 'sharp';

async function loadFontData(fontPath) {
    try {
      const fontBuffer = await fs.readFile(fontPath);
      return fontBuffer;
    } catch (error) {
      console.error('Error reading font file:', error);
      throw error; // Rethrow or handle as needed
    }
  }
  
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/png', async (req, res) => {
    // Extract dynamic data from query parameters
    const message = req.query.message || 'Hello, World!'; // Default message if none provided
    const robotoArrayBuffer = await loadFontData('Roboto-Regular.ttf');

    const options ={
        height:600,
        width:900,
        fonts: [
            {
              name: 'Roboto',
              // Use `fs` (Node.js only) or `fetch` to read the font as Buffer/ArrayBuffer and provide `data` here.
              data: robotoArrayBuffer,
              weight: 400,
              style: 'normal',
            },
          ],
    }
    
    let svg_test = await satori(
        {
          type: 'div',
          props: {
            children: message,
            style: { color: 'black' },
          },
        },
        options
      )
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