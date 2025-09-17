const { sequelize } = require('./config/database');

async function migrateProcedimentoOpcional() {
    try {
        console.log('Iniciando migração para tornar procedimento_id opcional...');
        
        // Verificar estrutura atual da tabela
        const [results] = await sequelize.query("DESCRIBE fotos_pacientes");
        const procedimentoColumn = results.find(row => row.Field === 'procedimento_id');
        
        console.log('Coluna procedimento_id atual:', procedimentoColumn);
        
        if (procedimentoColumn && procedimentoColumn.Null === 'NO') {
            console.log('Alterando coluna procedimento_id para permitir NULL...');
            
            // Alterar coluna para permitir NULL
            await sequelize.query(`
                ALTER TABLE fotos_pacientes 
                MODIFY COLUMN procedimento_id INT NULL
            `);
            
            console.log('✅ Coluna procedimento_id alterada para permitir NULL!');
        } else {
            console.log('✅ Coluna procedimento_id já permite NULL!');
        }
        
        // Verificar estrutura final
        const [finalResults] = await sequelize.query("DESCRIBE fotos_pacientes");
        const finalProcedimentoColumn = finalResults.find(row => row.Field === 'procedimento_id');
        
        console.log('\n📋 Estrutura final da coluna procedimento_id:');
        console.log(`- Campo: ${finalProcedimentoColumn.Field}`);
        console.log(`- Tipo: ${finalProcedimentoColumn.Type}`);
        console.log(`- Permite NULL: ${finalProcedimentoColumn.Null}`);
        console.log(`- Padrão: ${finalProcedimentoColumn.Default}`);
        
        console.log('\n🎉 Migração concluída com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Executar migração
migrateProcedimentoOpcional();