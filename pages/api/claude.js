export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, clientName } = req.body;
  const nomeCliente = clientName || "Cliente";

  const ultimaMensagem = messages[messages.length - 1];
  const textoUsuario = typeof ultimaMensagem.content === "string"
    ? ultimaMensagem.content
    : Array.isArray(ultimaMensagem.content)
      ? ultimaMensagem.content.find(b => b.type === "text")?.text || ""
      : "";

  const headers = {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
  };

  try {
    const supervisorRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 150,
        system: `Você é o supervisor de vendas da Brava. Analise e responda APENAS JSON sem markdown: {"agente":"objecoes"|"whatsapp"|"scripts"|"fechamento"}`,
        messages: [{ role: "user", content: `Cliente: ${nomeCliente}\nSituação: ${textoUsuario}` }]
      }),
    });
    const supervisorData = await supervisorRes.json();
    let agente = "fechamento";
    try {
      const texto = supervisorData.content?.[0]?.text || "{}";
      agente = JSON.parse(texto).agente || "fechamento";
    } catch {}

    const sistemas = {
      objecoes: "Você é um closer de vendas da Brava Assessoria. Gere APENAS 2 mensagens curtas prontas para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos, sem explicações. Apenas o texto da mensagem, separados por uma linha em branco. Linguagem natural, direta, sem soar vendedor desesperado.",
      whatsapp: "Você é um closer de vendas da Brava Assessoria. Gere APENAS 2 mensagens curtas prontas para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos, sem explicações. Apenas o texto da mensagem, separados por uma linha em branco. Mensagens curtas e naturais.",
      scripts: "Você é um closer de vendas da Brava Assessoria. Gere APENAS uma mensagem pronta para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos, sem explicações. Apenas o texto da mensagem. Linguagem natural e direta.",
      fechamento: "Você é um closer de vendas da Brava Assessoria. Gere APENAS 2 mensagens curtas prontas para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos, sem explicações. Apenas o texto da mensagem, separados por uma linha em branco. Direto ao fechamento.",
    };

    const agenteRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: `${sistemas[agente] || sistemas.fechamento}\n\nResponda sempre em português brasileiro.`,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      }),
    });
    const agenteData = await agenteRes.json();

    res.status(200).json({
      ...agenteData,
      _agente_acionado: agente
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
