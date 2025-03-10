// Importando as bibliotecas corretas
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Usar variáveis de ambiente para as chaves de API
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY;

if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
    console.error('Erro: Variáveis de ambiente OPENAI_API_KEY e/ou PINECONE_API_KEY não definidas');
    console.error('Configure as variáveis de ambiente no arquivo .env.local ou no painel da Vercel');
}

console.log('Usando variáveis de ambiente para as chaves de API');

// Initialize OpenAI e Pinecone clients
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

// Function to load data from the dataset
const fs = require('fs').promises;
const path = require('path');

// Função para dividir texto em pedaços menores
const chunkText = (text, maxChunkSize = 1000) => {
    // Dividir o texto em parágrafos
    const paragraphs = text.split('\n\n');
    const chunks = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
        // Se o parágrafo atual + o chunk atual exceder o tamanho máximo
        if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
            // Adicionar o chunk atual à lista de chunks
            chunks.push(currentChunk);
            currentChunk = '';
        }
        
        // Se o parágrafo for maior que o tamanho máximo, dividir em frases
        if (paragraph.length > maxChunkSize) {
            const sentences = paragraph.split(/(?<=[.!?])\s+/);
            for (const sentence of sentences) {
                if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            }
        } else {
            // Adicionar o parágrafo ao chunk atual
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }
    
    // Adicionar o último chunk se não estiver vazio
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    
    return chunks;
};

// Função para carregar dados dos arquivos
const loadData = async () => {
    try {
        const datasetPath = path.join(process.cwd(), 'dataset');
        const phase1Path = path.join(datasetPath, 'phase1_data.txt');
        const phase2Path = path.join(datasetPath, 'phase2_data.txt');
        
        const phase1Data = await fs.readFile(phase1Path, 'utf8');
        const phase2Data = await fs.readFile(phase2Path, 'utf8');
        
        return { phase1Data, phase2Data };
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    }
};

// Função para criar embeddings e armazenar no Pinecone
const storeEmbeddings = async (documents) => {
    try {
        // Criar um índice no Pinecone
        const indexName = 'langchain-demo';
        let indexExists = false;
        
        try {
            const indexList = await pinecone.listIndexes();
            console.log('Lista de índices:', indexList);
            
            // Verificar se o índice já existe
            if (indexList && Array.isArray(indexList.indexes)) {
                indexExists = indexList.indexes.some(index => index.name === indexName);
            } else if (indexList && typeof indexList === 'object') {
                // Se a resposta não for um array, tente verificar de outra forma
                indexExists = Object.values(indexList).some(index => 
                    index.name === indexName || index === indexName
                );
            }
            
            console.log(`Índice ${indexName} existe? ${indexExists}`);
        } catch (error) {
            console.error('Erro ao listar índices:', error);
        }
        
        // Criar o índice se não existir
        if (!indexExists) {
            console.log(`Criando índice ${indexName}...`);
            try {
                await pinecone.createIndex({
                    name: indexName,
                    dimension: 1536, // Dimensão dos embeddings do OpenAI
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });
                console.log('Índice criado com sucesso!');
                
                // Aguardar a criação do índice
                console.log('Aguardando a criação do índice...');
                await new Promise(resolve => setTimeout(resolve, 20000));
            } catch (error) {
                console.error('Erro ao criar índice:', error);
                if (error.message && error.message.includes('already exists')) {
                    console.log('O índice já existe, continuando...');
                } else {
                    throw error;
                }
            }
        }
        
        // Obter o índice
        const index = pinecone.index(indexName);
        
        // Processar documentos em lotes para evitar exceder o limite de tokens
        const batchSize = 5; // Ajuste conforme necessário
        const batches = [];
        
        for (let i = 0; i < documents.length; i += batchSize) {
            batches.push(documents.slice(i, i + batchSize));
        }
        
        console.log(`Dividido em ${batches.length} lotes para processamento.`);
        
        // Processar cada lote
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`Processando lote ${i+1}/${batches.length} com ${batch.length} documentos...`);
            
            // Criar embeddings para o lote
            const embeddings = await Promise.all(batch.map(async (doc, j) => {
                const response = await openai.embeddings.create({
                    model: 'text-embedding-ada-002',
                    input: doc
                });
                
                return {
                    id: `doc-${i}-${j}`,
                    values: response.data[0].embedding,
                    metadata: { text: doc }
                };
            }));
            
            // Inserir embeddings no Pinecone
            await index.upsert(embeddings);
            
            console.log(`Embeddings criados para o lote ${i+1}.`);
        }
        
        console.log('Todos os embeddings foram armazenados com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao criar ou armazenar embeddings:', error);
        throw error;
    }
};

// Função principal para configurar o RAG
const setupRAG = async () => {
    try {
        // Carregar dados
        const { phase1Data, phase2Data } = await loadData();
        console.log('Dados carregados com sucesso!');
        
        // Combinar os dados
        const combinedData = phase1Data + '\n\n' + phase2Data;
        
        // Dividir o texto em pedaços menores
        const chunks = chunkText(combinedData);
        console.log(`Dados divididos em ${chunks.length} pedaços.`);
        
        // Criar embeddings e armazenar no Pinecone
        console.log(`Processando ${chunks.length} documentos...`);
        await storeEmbeddings(chunks);
        
        console.log('RAG configurado com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao configurar RAG:', error);
        throw error;
    }
};

// Executar a configuração do RAG
setupRAG().then(() => {
    console.log('Processo concluído!');
}).catch(error => {
    console.error('Erro no processo:', error);
});

// Função para consultar o RAG com base na pergunta do usuário
const queryRAG = async (question) => {
    try {
        console.log('Consultando RAG para a pergunta:', question);
        
        // Processar a pergunta para garantir que seja uma string
        let questionText = '';
        
        if (typeof question === 'string') {
            questionText = question;
        } else if (Array.isArray(question)) {
            // Se for um array (como no formato de mensagens do OpenAI)
            questionText = question.map(item => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && 'text' in item) return item.text;
                return '';
            }).join(' ');
        } else if (question && typeof question === 'object') {
            // Se for um objeto, tentar extrair o texto ou converter para string
            if ('content' in question) {
                questionText = typeof question.content === 'string' ? 
                    question.content : JSON.stringify(question.content);
            } else if ('text' in question) {
                questionText = question.text;
            } else {
                questionText = JSON.stringify(question);
            }
        }
        
        console.log('Texto da pergunta processado:', questionText);
        
        // Obter o índice do Pinecone
        const indexName = 'langchain-demo';
        const index = pinecone.index(indexName);
        
        // Criar embedding para a pergunta
        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: questionText
        });
        
        const queryEmbedding = response.data[0].embedding;
        
        // Consultar o Pinecone para encontrar documentos semelhantes
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 5,
            includeMetadata: true
        });
        
        console.log('Resposta da consulta ao Pinecone:', queryResponse);
        console.log('Documentos encontrados:', queryResponse.matches);
        
        // Extrair os textos dos documentos encontrados
        const contexts = queryResponse.matches.map(match => match.metadata.text);
        
        console.log(`Encontrados ${contexts.length} documentos relevantes.`);
        
        return contexts;
    } catch (error) {
        console.error('Erro ao consultar RAG:', error);
        return [];
    }
};

module.exports = {
    loadData,
    storeEmbeddings,
    setupRAG,
    queryRAG
};
