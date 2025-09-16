const { sequelize } = require('./config/database');

async function migrateExames() {
    try {
        console.log('Iniciando migração da tabela exames...');
        
        // Verificar se as colunas já existem
        const [results] = await sequelize.query("DESCRIBE exames");
        const existingColumns = results.map(row => row.Field);
        
        console.log('Colunas existentes:', existingColumns);
        
        // Migrar campo resultado para resultados_json se necessário
        if (existingColumns.includes('resultado') && !existingColumns.includes('resultados_json')) {
            console.log('Migrando dados existentes...');
            
            // Adicionar nova coluna
            await sequelize.query(`
                ALTER TABLE exames 
                ADD COLUMN status ENUM('solicitado', 'em_andamento', 'concluido') NOT NULL DEFAULT 'solicitado' AFTER data_exame,
                ADD COLUMN resultados_json JSON NULL COMMENT 'Armazena resultados como array de objetos {chave: valor}' AFTER status
            `);
            
            console.log('✅ Novas colunas adicionadas!');
            
            // Migrar dados existentes do campo resultado para resultados_json
            const [examesComResultado] = await sequelize.query(`
                SELECT id, resultado FROM exames WHERE resultado IS NOT NULL AND resultado != ''
            `);
            
            for (const exame of examesComResultado) {
                if (exame.resultado) {
                    // Converter resultado texto para formato JSON
                    const resultadoJson = [{
                        chave: 'Resultado',
                        valor: exame.resultado
                    }];
                    
                    await sequelize.query(`
                        UPDATE exames 
                        SET resultados_json = ?, status = 'concluido'
                        WHERE id = ?
                    `, {
                        replacements: [JSON.stringify(resultadoJson), exame.id]
                    });
                }
            }
            
            console.log(`✅ Migrados ${examesComResultado.length} exames com resultados!`);
            
            // Remover coluna antiga (opcional - comentado por segurança)
            // await sequelize.query('ALTER TABLE exames DROP COLUMN resultado');
            // console.log('✅ Coluna resultado removida!');
            
        } else if (!existingColumns.includes('status')) {
            // Apenas adicionar novas colunas se não existirem
            await sequelize.query(`
                ALTER TABLE exames 
                ADD COLUMN status ENUM('solicitado', 'em_andamento', 'concluido') NOT NULL DEFAULT 'solicitado' AFTER data_exame,
                ADD COLUMN resultados_json JSON NULL COMMENT 'Armazena resultados como array de objetos {chave: valor}' AFTER status
            `);
            console.log('✅ Novas colunas adicionadas!');
        } else {
            console.log('⚠️ Colunas já existem, pulando migração...');
        }
        
        // Verificar resultado final
        const [finalResults] = await sequelize.query("DESCRIBE exames");
        console.log('\n📋 Estrutura final da tabela exames:');
        finalResults.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });
        
        console.log('\n🎉 Migração de exames concluída com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Executar migração
migrateExames();