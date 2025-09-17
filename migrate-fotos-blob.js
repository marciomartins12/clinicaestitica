const { sequelize } = require('./config/database');

async function migrateFotosBlob() {
    try {
        console.log('Iniciando migração da tabela fotos_pacientes para BLOB...');
        
        // Verificar estrutura atual da tabela
        const [results] = await sequelize.query("DESCRIBE fotos_pacientes");
        const existingColumns = results.map(row => row.Field);
        
        console.log('Colunas existentes:', existingColumns);
        
        // Verificar se precisa fazer alterações
        const hasBlob = existingColumns.includes('foto');
        const hasCaminhoArquivo = existingColumns.includes('caminho_arquivo');
        const hasMomento = existingColumns.includes('momento_procedimento');
        const hasProcedimentoId = existingColumns.includes('procedimento_id');
        
        console.log('Status das colunas:');
        console.log('- foto (BLOB):', hasBlob);
        console.log('- caminho_arquivo:', hasCaminhoArquivo);
        console.log('- momento_procedimento:', hasMomento);
        console.log('- procedimento_id:', hasProcedimentoId);
        
        let needsUpdate = false;
        
        // Adicionar coluna foto se não existir
        if (!hasBlob) {
            console.log('Adicionando coluna foto (LONGBLOB)...');
            await sequelize.query(`
                ALTER TABLE fotos_pacientes 
                ADD COLUMN foto LONGBLOB NOT NULL
            `);
            needsUpdate = true;
        }
        
        // Adicionar coluna tipo_arquivo se não existir
        if (!existingColumns.includes('tipo_arquivo')) {
            console.log('Adicionando coluna tipo_arquivo...');
            await sequelize.query(`
                ALTER TABLE fotos_pacientes 
                ADD COLUMN tipo_arquivo VARCHAR(10) NOT NULL DEFAULT 'jpg'
            `);
            needsUpdate = true;
        }
        
        // Adicionar coluna tamanho_arquivo se não existir
        if (!existingColumns.includes('tamanho_arquivo')) {
            console.log('Adicionando coluna tamanho_arquivo...');
            await sequelize.query(`
                ALTER TABLE fotos_pacientes 
                ADD COLUMN tamanho_arquivo INT NULL
            `);
            needsUpdate = true;
        }
        
        // Corrigir nome da coluna momento se necessário
        if (!hasMomento && existingColumns.includes('momento')) {
            console.log('Renomeando coluna momento para momento_procedimento...');
            await sequelize.query(`
                ALTER TABLE fotos_pacientes 
                CHANGE COLUMN momento momento_procedimento ENUM('antes', 'durante', 'depois') NOT NULL
            `);
            needsUpdate = true;
        }
        
        // Corrigir nome da coluna procedimento se necessário
        if (!hasProcedimentoId && existingColumns.includes('procedimento')) {
            console.log('Renomeando coluna procedimento para procedimento_id...');
            await sequelize.query(`
                ALTER TABLE fotos_pacientes 
                CHANGE COLUMN procedimento procedimento_id INT NOT NULL
            `);
            
            // Adicionar foreign key se não existir
            await sequelize.query(`
                ALTER TABLE fotos_pacientes 
                ADD CONSTRAINT fk_fotos_procedimento 
                FOREIGN KEY (procedimento_id) REFERENCES agendamentos(id)
            `);
            needsUpdate = true;
        }
        
        // Remover coluna caminho_arquivo se existir (após migração)
        if (hasCaminhoArquivo) {
            console.log('⚠️ Coluna caminho_arquivo encontrada.');
            console.log('⚠️ Recomenda-se migrar dados antes de remover esta coluna.');
            // await sequelize.query('ALTER TABLE fotos_pacientes DROP COLUMN caminho_arquivo');
        }
        
        if (needsUpdate) {
            console.log('✅ Estrutura da tabela atualizada!');
        } else {
            console.log('✅ Tabela já está na estrutura correta!');
        }
        
        // Verificar estrutura final
        const [finalResults] = await sequelize.query("DESCRIBE fotos_pacientes");
        console.log('\n📋 Estrutura final da tabela fotos_pacientes:');
        finalResults.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });
        
        console.log('\n🎉 Migração de fotos para BLOB concluída!');
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Executar migração
migrateFotosBlob();