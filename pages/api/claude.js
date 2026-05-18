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
        system: `Você é supervisor de vendas. Analise a situação e responda APENAS JSON sem markdown: {"agente":"objecoes"|"whatsapp"|"scripts"|"fechamento"|"marketing"}`,
        messages: [{ role: "user", content: `Cliente: ${nomeCliente}\nSituação: ${textoUsuario}` }]
      }),
    });
    const supervisorData = await supervisorRes.json();
    let agente = "marketing";
    try {
      const texto = supervisorData.content?.[0]?.text || "{}";
      agente = JSON.parse(texto).agente || "marketing";
    } catch {}

    const sistemas = {
      objecoes: `Você é um closer de vendas da Brava Assessoria. Gere APENAS 1 mensagem curta pronta para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos. Apenas texto puro natural. Tom seguro, direto, empático. Conduza o cliente ao próximo passo.`,
      whatsapp: `Você é um closer de vendas da Brava Assessoria. Gere APENAS 1 mensagem curta pronta para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos. Apenas texto puro natural. Mensagem curta e direta.`,
      scripts: `Você é um closer de vendas da Brava Assessoria. Gere APENAS 1 mensagem curta pronta para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos. Apenas texto puro natural. Tom direto e consultivo.`,
      fechamento: `Você é um closer de vendas da Brava Assessoria. Gere APENAS 1 mensagem curta pronta para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos. Apenas texto puro natural. Foco em conduzir ao sim agora.`,
      marketing: `Você é um closer especialista em fotografia, vídeo e marketing digital da Brava Assessoria. Gere APENAS 1 mensagem curta para copiar e enviar no WhatsApp. Sem títulos, sem markdown, sem asteriscos. Apenas texto puro natural como se fosse digitar agora. Tom próximo e confiante.

FLUXO OBRIGATÓRIO: Siga essa ordem antes de falar de preço:
1. Entender data e tipo de evento
2. Entender estilo desejado
3. Entender o que é mais importante para o cliente
4. Entender estrutura do evento
5. Só então apresentar investimento

REGRAS:
- Faça apenas UMA pergunta por mensagem
- Nunca mencione preço antes de 3 perguntas de diagnóstico
- Tom leve e natural, máximo 3 linhas
- Nunca soar apressado ou vendedor

PREÇOS (apenas quando cliente estiver pronto):
- Fotografia: R$ 5.000
- Vídeo: R$ 7.000
- Foto + Vídeo: R$ 12.000
- Álbum 30x30 80 fotos: R$ 3.200`,
    };

    const agenteRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        system: `${sistemas[agente] || sistemas.marketing}\n\nResponda sempre em português brasileiro. GERE APENAS 1 MENSAGEM CURTA.`,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      }),
    });
    const agenteData = await agenteRes.json();
    const textoCompleto = agenteData.content?.[0]?.text || "Erro ao gerar resposta.";
    const primeiraMsg = textoCompleto.split('\n\n')[0].trim();

    res.status(200).json({
      content: [{ type: "text", text: primeiraMsg }],
      _agente_acionado: agente
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
