require('dotenv').config({ path: '.env.local' });

module.exports = {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY
};
