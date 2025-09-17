const { sequelize } = require('./config/database');

async function migrateItensExame() {
    try {
        console.log('Iniciando migração da tabela itens_exame...');
        
        // Verificar se a tabela já existe
        const [tables] = await sequelize.query("SHOW TABLES LIKE 'itens_exame'");
        
        if (tables.length === 0) {
            console.log('Criando tabela itens_exame...');
            
            // Criar tabela itens_exame
            await sequelize.query(`
                CREATE TABLE itens_exame (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    exame_id INT NOT NULL,
                    chave VARCHAR(100) NOT NULL COMMENT 'Nome do resultado (ex: Tipo Sanguíneo, Glicemia)',
                    valor VARCHAR(255) NOT NULL COMMENT 'Valor do resultado (ex: A+, 95 mg/dL)',
                    unidade VARCHAR(50) NULL COMMENT 'Unidade de medida (ex: mg/dL, g/dL)',
                    valor_referencia VARCHAR(100) NULL COMMENT 'Valor de referência normal',
                    observacoes TEXT NULL,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (exame_id) REFERENCES exames(id) ON DELETE CASCADE,
                    INDEX idx_exame_id (exame_id)
                )
            `);
            
            console.log('✅ Tabela itens_exame criada com sucesso!');
            
            // Migrar dados existentes do campo resultados_json para a nova tabela
            console.log('Migrando dados existentes...');
            
            const [examesComResultados] = await sequelize.query(`
                SELECT id, resultados_json FROM exames 
                WHERE resultados_json IS NOT NULL AND resultados_json != ''
            `);
            
            let totalMigrados = 0;
            
            for (const exame of examesComResultados) {
                if (exame.resultados_json) {
                    try {
                        const resultados = JSON.parse(exame.resultados_json);
                        
                        if (Array.isArray(resultados) && resultados.length > 0) {
                            for (const resultado of resultados) {
                                if (resultado.chave && resultado.valor) {
                                    await sequelize.query(`
                                        INSERT INTO itens_exame (exame_id, chave, valor, criado_em, atualizado_em)
                                        VALUES (?, ?, ?, NOW(), NOW())
                                    `, {
                                        replacements: [exame.id, resultado.chave, resultado.valor]
                                    });
                                    totalMigrados++;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`Erro ao migrar resultados do exame ${exame.id}:`, e.message);
                    }
                }
            }
            
            console.log(`✅ Migrados ${totalMigrados} resultados de ${examesComResultados.length} exames!`);
            
        } else {
            console.log('⚠️ Tabela itens_exame já existe, pulando criação...');
        }
        
        // Verificar estrutura final
        const [finalResults] = await sequelize.query("DESCRIBE itens_exame");
        console.log('\n📋 Estrutura da tabela itens_exame:');
        finalResults.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });
        
        // Verificar dados migrados
        const [countResults] = await sequelize.query("SELECT COUNT(*) as total FROM itens_exame");
        console.log(`\n📊 Total de resultados na tabela: ${countResults[0].total}`);
        
        console.log('\n🎉 Migração de itens_exame concluída com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Executar migração
migrateItensExame();