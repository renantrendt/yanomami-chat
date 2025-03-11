# Assistente Yanomami com RAG

Este projeto é um assistente de chat que utiliza um sistema de Recuperação Aumentada por Geração (RAG) para fornecer informações precisas sobre a língua e cultura Yanomami.

Teste em real-time: www.amazonias.com.br

## Funcionalidades

- Chat interativo com interface amigável
- Sistema RAG integrado com Pinecone para armazenamento e recuperação de vetores
- Consulta automática de informações sobre a língua e cultura Yanomami
- Respostas precisas baseadas em dados armazenados

## Configuração Local

1. Adicione suas chaves de API ao arquivo `.env.local`:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PINECONE_API_KEY=pcsk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGCHAIN_API_KEY=lsv2-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. Instale as dependências e execute o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

## Deploy na Vercel

Para fazer o deploy deste projeto na Vercel, siga estas etapas:

1. Crie uma conta na [Vercel](https://vercel.com) se ainda não tiver uma

2. Instale a CLI da Vercel:

```bash
npm install -g vercel
```

3. Faça login na sua conta Vercel:

```bash
vercel login
```

4. Configure as variáveis de ambiente na Vercel:
   - Acesse o painel da Vercel
   - Vá para o seu projeto
   - Clique em "Settings" > "Environment Variables"
   - Adicione as seguintes variáveis:
     - `OPENAI_API_KEY`
     - `PINECONE_API_KEY`
     - `LANGCHAIN_API_KEY`

5. Faça o deploy do projeto:

```bash
vercel
```

Ou, para fazer o deploy diretamente para produção:

```bash
vercel --prod
```

6. Acesse a URL fornecida pela Vercel para ver seu aplicativo em funcionamento!

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
