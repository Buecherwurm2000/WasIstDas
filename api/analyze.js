export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: "Du analysierst Fotos. Antworte in zwei Teilen getrennt durch einen Zeilenumbruch: Erste Zeile: NUR der Hauptbegriff in maximal 3 Woertern. Zweite Zeile: Eine kurze Erklaerung in 1-2 Saetzen. Kein Markdown, keine #, keine **. Antworte auf Deutsch.",
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: imageBase64
              }
            },
            { type: "text", text: "Was ist das auf dem Foto?" }
          ]
        }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Anthropic error:", response.status, responseText);
      return res.status(500).json({ error: "API error: " + response.status, details: responseText });
    }

    const data = JSON.parse(responseText);
    const answer = data.content?.[0]?.text?.trim() || "Keine Antwort erhalten";
    return res.status(200).json({ answer });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message || "Unbekannter Fehler" });
  }
}
