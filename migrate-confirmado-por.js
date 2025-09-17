const { sequelize } = require('./config/database');
const { QueryInterface, DataTypes } = require('sequelize');

async function adicionarCampoConfirmadoPor() {
    try {
        console.log('Iniciando migração: Adicionar campo confirmado_por na tabela pagamentos...');
        
        // Verificar se a coluna já existe
        const [results] = await sequelize.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pagamentos' AND COLUMN_NAME = 'confirmado_por'"
        );
        
        if (results.length > 0) {
            console.log('Campo confirmado_por já existe na tabela pagamentos.');
            return;
        }
        
        // Adicionar a coluna confirmado_por
        await sequelize.getQueryInterface().addColumn('pagamentos', 'confirmado_por', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'usuarios',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });
        
        console.log('✅ Campo confirmado_por adicionado com sucesso na tabela pagamentos!');
        console.log('✅ Migração concluída!');
        
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        throw error;
    }
}

// Executar migração se chamado diretamente
if (require.main === module) {
    adicionarCampoConfirmadoPor()
        .then(() => {
            console.log('Migração executada com sucesso!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Erro ao executar migração:', error);
            process.exit(1);
        });
}

module.exports = adicionarCampoConfirmadoPor;