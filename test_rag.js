// Script para testar o RAG
const { queryRAG } = require('./app/api/rag_system');

async function testRAG() {
    console.log('Iniciando teste do RAG...');
    
    const testQueries = [
        'what means mi weya in yanomami?',
        'what does poreri mean in yanomami language?',
        'what is the meaning of ka in yanomami?'
    ];
    
    for (const query of testQueries) {
        console.log(`\n\nTestando consulta: "${query}"`);
        try {
            const results = await queryRAG(query);
            console.log(`Encontrados ${results.length} resultados relevantes.`);
            
            if (results.length > 0) {
                console.log('Primeiros 3 resultados:');
                results.slice(0, 3).forEach((result, index) => {
                    console.log(`\n--- Resultado ${index + 1} ---`);
                    console.log(result.substring(0, 300) + (result.length > 300 ? '...' : ''));
                });
            } else {
                console.log('Nenhum resultado encontrado.');
            }
        } catch (error) {
            console.error('Erro ao consultar RAG:', error);
        }
    }
}

testRAG().then(() => {
    console.log('\nTeste concluído!');
}).catch(error => {
    console.error('Erro no teste:', error);
});
