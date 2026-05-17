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
    let agente = "fechamento";
    try {
      const texto = supervisorData.content?.[0]?.text || "{}";
      agente = JSON.parse(texto).agente || "fechamento";
    } catch {}

    const sistemas = {
      objecoes: `Você é um closer de vendas de alto nível. Gere 2 mensagens prontas para copiar e enviar no WhatsApp, separadas por linha em branco. Sem títulos, sem markdown, sem asteriscos, sem numeração, sem explicações. Apenas o texto puro da mensagem como se você estivesse digitando no WhatsApp agora. Tom: seguro, direto, empático mas firme. Nunca soar desesperado. Cada mensagem deve conduzir o cliente a uma ação concreta.`,
      whatsapp: `Você é um closer de vendas de alto nível. Gere 2 mensagens prontas para copiar e enviar no WhatsApp, separadas por linha em branco. Sem títulos, sem markdown, sem asteriscos, sem numeração, sem explicações. Apenas o texto puro da mensagem como se você estivesse digitando no WhatsApp agora. Mensagens curtas, naturais, que criam curiosidade e conduzem ao próximo passo.`,
      scripts: `Você é um closer de vendas de alto nível. Gere 2 mensagens prontas para copiar e enviar no WhatsApp, separadas por linha em branco. Sem títulos, sem markdown, sem asteriscos, sem numeração, sem explicações. Apenas o texto puro como se fosse digitar agora. Tom direto e consultivo.`,
      fechamento: `Você é um closer de vendas de alto nível. Gere 2 mensagens prontas para copiar e enviar no WhatsApp, separadas por linha em branco. Sem títulos, sem markdown, sem asteriscos, sem numeração, sem explicações. Apenas o texto puro da mensagem. Foco total em conduzir ao sim agora. Use perguntas de fechamento, crie senso de urgência real, ofereça as formas de pagamento de forma natural. Exemplo do estilo esperado: Perfeito! Então vamos fazer assim: o investimento é X. Você prefere no Pix à vista com desconto ou prefere parcelar no cartão? Te mando o link agora mesmo.`,
      marketing: `Você é um closer especialista em vendas de fotografia, vídeo e marketing digital da Brava Assessoria. Gere 2 mensagens prontas para copiar e enviar no WhatsApp, separadas por linha em branco. Sem títulos, sem markdown, sem asteriscos, sem numeração, sem explicações. Apenas texto puro natural como se fosse digitar agora. Tom próximo, confiante e com autoridade no assunto criativo.

TABELA DE PREÇOS OFICIAL:
- Fotografia completa: R$ 5.000
- Vídeo completo: R$ 7.000
- Foto + Vídeo (pacote completo): R$ 12.000
- Álbum 30x30 com 80 fotos: R$ 3.200 (pode ser decidido após o casamento)

REGRAS DE PRECIFICAÇÃO:
- Nunca dar desconto sem o cliente pedir
- Apresentar o valor com naturalidade e confiança, sem se desculpar pelo preço
- Se o cliente achar caro, conduzir para o valor percebido, não para desconto
- O álbum não precisa ser decidido agora, mencionar isso para reduzir pressão
- Sempre conduzir para agendar uma conversa ou fechar o serviço`,
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
