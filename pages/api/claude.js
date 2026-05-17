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
      objecoes: `Você é especialista em quebra de objeções da Brava Assessoria. Cliente "${nomeCliente}" apresentou objeção. Gere 2 respostas prontas para copiar. Sem emojis. Direto, seguro, sem soar desesperado. Termine sempre conduzindo ao próximo passo.`,
      whatsapp: `Você é especialista em mensagens de WhatsApp para vendas da Brava Assessoria. Cliente: "${nomeCliente}". Mensagens curtas e diretas. Sem emojis. Termine com pergunta ou ação clara. Gere 2 opções para o closer escolher.`,
      scripts: `Você é especialista em scripts de venda da Brava Assessoria. Cliente: "${nomeCliente}". Gere roteiro pronto para usar. Indique onde pausar e ouvir. Inclua variações de fechamento no final.`,
      fechamento: `Você é especialista em fechamento de vendas da Brava Assessoria. Cliente: "${nomeCliente}". Foco total em conduzir ao sim. Valor antes de preço. Direto e seguro. Gere resposta pronta para o momento decisivo.`,
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
