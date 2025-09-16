const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Recado = sequelize.define('Recado', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    titulo: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    mensagem: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('info', 'aviso', 'urgente', 'sucesso'),
        allowNull: false,
        defaultValue: 'info'
    },
    autor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    destinatario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    publico: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    data_expiracao: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lido: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    prioridade: {
        type: DataTypes.ENUM('baixa', 'media', 'alta'),
        allowNull: false,
        defaultValue: 'media'
    }
}, {
    tableName: 'recados',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});


// Definir associações
Recado.associate = function(models) {
    Recado.belongsTo(models.Usuario, {
        foreignKey: 'autor_id',
        as: 'autor'
    });
    Recado.belongsTo(models.Usuario, {
        foreignKey: 'destinatario_id',
        as: 'destinatario'
    });
};

// Métodos estáticos
Recado.buscarAtivos = async function() {
    try {
        const { Op } = require('sequelize');
        return await Recado.findAll({
            where: {
                ativo: true,
                [Op.or]: [
                    { data_expiracao: null },
                    { data_expiracao: { [Op.gt]: new Date() } }
                ]
            },
            include: [{
                model: require('./Usuario'),
                as: 'autor',
                attributes: ['nome']
            }],
            order: [['prioridade', 'DESC'], ['criado_em', 'DESC']]
        });
    } catch (error) {
        console.error('Erro ao buscar recados ativos:', error);
        throw error;
    }
};

Recado.buscarPorUsuario = async function(usuarioId) {
    try {
        const { Op } = require('sequelize');
        return await Recado.findAll({
            where: {
                ativo: true,
                [Op.and]: [
                    {
                        [Op.or]: [
                            { data_expiracao: null },
                            { data_expiracao: { [Op.gt]: new Date() } }
                        ]
                    },
                    {
                        [Op.or]: [
                            { publico: true },
                            { destinatario_id: usuarioId }
                        ]
                    }
                ]
            },
            include: [{
                model: require('./Usuario'),
                as: 'autor',
                attributes: ['nome']
            }],
            order: [['prioridade', 'DESC'], ['criado_em', 'DESC']]
        });
    } catch (error) {
        console.error('Erro ao buscar recados por usuário:', error);
        throw error;
    }
};

module.exports = Recado;