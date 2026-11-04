const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supported Gemini multimodal models in order of preference
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

/**
 * Determine image MIME type from file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.jpeg':
    case '.jpg':
    default:
      return 'image/jpeg';
  }
}

/**
 * Validates whether an image matches the reported issue type using Gemini Vision API.
 * Works for both direct file uploads and camera-captured images.
 *
 * @param {string} imagePath - Absolute or relative path to the image file on disk.
 * @param {string} issueType - The citizen's selected issue type (e.g. "Road Potholes", "Streetlight Issues").
 * @returns {Promise<boolean>} True if the image is valid for the issue, false otherwise.
 */
async function validateImageWithGemini(imagePath, issueType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY not configured. Skipping AI vision verification.');
    return true; // Graceful fallback in development if key is not yet set
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`⚠️ Image file not found at path: ${imagePath}`);
    return false;
  }

  const base64Data = fs.readFileSync(imagePath).toString('base64');
  const mimeType = getMimeType(imagePath);

  const promptText = `You are an automated image validation system for a municipal public infrastructure complaint portal (MyRoad India).
The user is reporting an issue under the category/issue type: "${issueType}".

Analyze the image carefully.
Question: Does this image depict, relate to, or show evidence of "${issueType}" or municipal infrastructure issues (such as roads, potholes, damaged asphalt, waterlogging, drainage, manholes, streetlights, bridges, pavements, sanitation, etc.)?

CRITICAL RULES:
1. If the image shows the reported issue, damage, or relevant public infrastructure, respond with the exact word: VALID
2. If the image is completely unrelated (e.g., a person's selfie, pet/animal, food, toys/dolls, indoor bedroom/office, memes, documents, cartoons, furniture, vehicles with no road context, or random screenshots), respond with the exact word: INVALID

Respond with ONLY the word VALID or INVALID. Do not include any explanations or punctuation.`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 10,
    },
  };

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        timeout: 12000,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini API call failed with model ${model} (HTTP ${response.status}):`, errText);
        // If model not found or deprecated, try next model in list
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() || '';
      console.log(`[Gemini Vision] Model: ${model} | Issue: "${issueType}" | Verdict: "${rawText}"`);

      // If the answer contains VALID and not INVALID
      if (rawText.includes('VALID') && !rawText.includes('INVALID')) {
        return true;
      }

      return false;
    } catch (err) {
      console.error(`Gemini Vision error with model ${model}:`, err.message);
    }
  }

  // If all models failed to respond or network error occurred, log and reject
  console.error('All Gemini vision endpoints failed to validate image.');
  return false;
}

module.exports = { validateImageWithGemini };
