export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { question, existing } = req.body;

  const prompt = `Du generierst eine einzelne kurze Antwortmöglichkeit für eine Frage in einer App.

Frage: "${question || 'Keine Frage angegeben'}"
Bereits vorhandene Antworten: ${existing && existing.length ? existing.join(', ') : 'keine'}

Regeln:
- Generiere NUR eine einzige neue Antwort
- Passe die Länge an die vorhandenen Antworten an (kurz wenn die anderen kurz sind, länger wenn die anderen länger sind)
- Die Antwort soll zur Frage passen und sich von den vorhandenen unterscheiden
- Antworte NUR mit dem Text der Antwort, ohne Anführungszeichen, ohne Erklärung, ohne Nummerierung`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': "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",
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const answer = data.content?.[0]?.text?.trim() || '';
    res.status(200).json({ answer });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
