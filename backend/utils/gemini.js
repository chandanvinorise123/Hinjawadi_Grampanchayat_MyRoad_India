const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

/**
 * Calls Gemini Vision to verify that an image matches the given issue type.
 * Returns true if Gemini replies with the word "VALID" (case‑insensitive).
 */
async function validateImageWithGemini(imagePath, issueType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('⚠️ GEMINI_API_KEY not set – image validation disabled.');
    return true; // allow if no key (you may choose to reject instead)
  }

  const base64 = fs.readFileSync(imagePath, { encoding: 'base64' });

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Issue type: "${issueType}". Classify the image. Respond ONLY with the word VALID if the image clearly shows the issue, otherwise respond with INVALID.`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64
            }
          }
        ]
      }
    ]
  };

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout: 8000
  });

  if (!resp.ok) {
    console.error('Gemini API error:', resp.status, await resp.text());
    return false;
  }

  const json = await resp.json();
  const answer = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase();
  return answer === 'VALID';
}

module.exports = { validateImageWithGemini };
