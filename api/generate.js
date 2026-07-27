export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-goog-api-key'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Obfuscated Project Keys
    const KEY_PENINSULA = "QVEuQWI4Uk42S09tU2pWaVJMVkhTbzVMNWVNUEhtck9IeDdtb2dkRER1dlZFZXdYTndEZFE=";
    const KEY_HUE_HERITAGE = "QVEuQWI4Uk42SUN1Q3daUjV4LUdEY1FDdkpacUFkcFlLSTkyYjh6d0xVNm1LYlY1TDh5UGc=";

    try {
        const { systemInstruction, userMessage, model, project } = req.body;
        const targetModel = model || 'gemini-3.6-flash';

        // Select specific project API Key
        const targetObfuscatedKey = (project === 'hue_heritage') ? KEY_HUE_HERITAGE : KEY_PENINSULA;
        const apiKey = process.env.GEMINI_API_KEY || Buffer.from(targetObfuscatedKey, 'base64').toString('utf-8').trim();

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: [{
                    role: "user",
                    parts: [{ text: userMessage }]
                }],
                generationConfig: {
                    temperature: 0.85,
                    maxOutputTokens: 16384
                }
            })
        });

        const text = await response.text();

        if (!response.ok) {
            return res.status(response.status).send(text);
        }

        return res.status(200).send(text);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
