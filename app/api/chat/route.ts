import { openai } from "@ai-sdk/openai";
import { jsonSchema, streamText } from "ai";
import { queryRAG } from "../rag_system";

export const maxDuration = 60; // Limitado a 60 segundos para compatibilidade com o plano gratuito da Vercel

export async function POST(req: Request) {
  console.log("\n\n===== NOVA REQUISIÇÃO DO FRONT-END =====");
  console.log("Data e hora:", new Date().toISOString());
  
  const { messages, system, tools } = await req.json();
  
  console.log("Mensagens recebidas:", JSON.stringify(messages, null, 2));
  console.log("Sistema prompt recebido:", system);

  // Obter a última mensagem do usuário
  const lastUserMessage = messages[messages.length - 1]?.content || "";
  console.log("\n\u00daltima mensagem do usuário:", lastUserMessage);

  try {
    // Verificar se a mensagem contém palavras-chave relacionadas a Yanomami
    console.log("\n===== VERIFICANDO SE É CONSULTA YANOMAMI =====");
    
    // Converter para string se for um objeto
    let messageText = '';
    if (typeof lastUserMessage === 'string') {
      messageText = lastUserMessage;
    } else if (Array.isArray(lastUserMessage)) {
      messageText = lastUserMessage.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) return item.text;
        return '';
      }).join(' ');
    } else if (lastUserMessage && typeof lastUserMessage === 'object') {
      messageText = JSON.stringify(lastUserMessage);
    }
    
    console.log("Texto da mensagem para análise:", messageText);
    
    // SEMPRE consultar o RAG, independentemente do conteúdo da mensagem
    console.log("SEMPRE consultando o RAG, independentemente do conteúdo da mensagem");
    
    // Definir isYanomamiQuery como true para sempre consultar o RAG
    const isYanomamiQuery = true;
    
    console.log("É consulta Yanomami?", isYanomamiQuery);
    
    let enhancedSystem = system || "";
    
    // Sempre entrar neste bloco, já que isYanomamiQuery é sempre true
    if (isYanomamiQuery) {
      console.log("\n===== INICIANDO CONSULTA AO RAG =====");
      console.log("Detectada consulta relacionada a Yanomami.");
      console.log("Enviando para o RAG:", lastUserMessage);
      
      try {
        // Consultar o RAG para obter contextos relevantes
        console.log("Chamando função queryRAG...");
        const startTime = Date.now();
        const ragContexts = await queryRAG(lastUserMessage);
        const endTime = Date.now();
        console.log(`Consulta RAG concluída em ${endTime - startTime}ms`);
        console.log(`Encontrados ${ragContexts.length} contextos relevantes no RAG`);
        
        if (ragContexts && ragContexts.length > 0) {
          console.log("Primeiros 100 caracteres do primeiro contexto:", typeof ragContexts[0] === 'string' ? ragContexts[0].substring(0, 100) : JSON.stringify(ragContexts[0]).substring(0, 100));
          
          // Adicionar contexto do RAG ao prompt do sistema
          enhancedSystem = `${enhancedSystem}\n\n### IMPORTANT INFORMATION ###\n\nThe following are information from the knowledge base about the Yanomami language and culture in English:\n\n${ragContexts.join('\n\n')}\n\n### INSTRUCTIONS ###\n\nWhen answering questions about Yanomami words or concepts, use EXCLUSIVELY the information provided above in English. DO NOT invent or use prior knowledge about Yanomami that is not in the provided context.\n\nIf the requested information is not present in the above context, inform that you do not have that specific information in your Yanomami knowledge base.\n\nYou MUST ONLY use the information provided in the context above. If you cannot find the answer in the provided context, state that you don't have that information in your knowledge base.\n\nPlease respond in English.`;
          
          console.log("Sistema aprimorado com dados do RAG");
          console.log("Tamanho do sistema prompt:", enhancedSystem.length, "caracteres");
        } else {
          console.log("Nenhum contexto relevante encontrado no RAG");
        }
      } catch (error) {
        console.error("ERRO AO CONSULTAR RAG:", error);
      }
    } else {
      console.log("Consulta não relacionada a Yanomami, pulando consulta RAG");
    }

    console.log("Enviando consulta para OpenAI com sistema aprimorado");
    
    // Adicionar uma mensagem de sistema no início para reforçar o uso exclusivo das informações do RAG
    const systemMessage = {
      role: "system",
      content: "You are a specialized interpreter in the Yanomami language. You will provide both literal and adapted translations that you received from the RAG. If there are other options in the RAG, provide additional options, indicating that they are less likely but it may be useful for the user to know.Always respond in English."
    };
    
    // Criar uma nova lista de mensagens com a mensagem de sistema no início
    const enhancedMessages = [systemMessage, ...messages];
    
    const result = streamText({
      model: openai("gpt-4o"),
      messages: enhancedMessages,
      system: enhancedSystem,
      tools: Object.fromEntries(
        Object.keys(tools).map((name) => [
          name,
          { ...tools[name], parameters: jsonSchema(tools[name].parameters) },
        ])
      ),
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Erro ao processar consulta:", error);
    
    // Fallback para resposta sem RAG em caso de erro, mas ainda tentando usar as instruções de responder em inglês
    const systemMessageFallback = {
      role: "system",
      content: "You are a helpful assistant. Please respond in English."
    };
    
    // Criar uma nova lista de mensagens com a mensagem de sistema no início
    const enhancedMessagesFallback = [systemMessageFallback, ...messages];
    
    const result = streamText({
      model: openai("gpt-4o"),
      messages: enhancedMessagesFallback,
      system: system + "\n\nPlease respond in English.",
      tools: Object.fromEntries(
        Object.keys(tools).map((name) => [
          name,
          { ...tools[name], parameters: jsonSchema(tools[name].parameters) },
        ])
      ),
    });

    return result.toDataStreamResponse();
  }
}
