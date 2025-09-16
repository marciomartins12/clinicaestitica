const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ItemPrescricao = sequelize.define('ItemPrescricao', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    prescricao_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'prescricoes',
            key: 'id'
        }
    },
    produto_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'produtos',
            key: 'id'
        }
    },
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    dosagem: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    frequencia: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    duracao: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    instrucoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'itens_prescricao',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

module.exports = ItemPrescricao;