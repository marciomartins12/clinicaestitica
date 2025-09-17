const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ItemExame = sequelize.define('ItemExame', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    exame_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'exames',
            key: 'id'
        }
    },
    chave: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nome do resultado (ex: Tipo Sanguíneo, Glicemia)'
    },
    valor: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Valor do resultado (ex: A+, 95 mg/dL)'
    },
    unidade: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Unidade de medida (ex: mg/dL, g/dL)'
    },
    valor_referencia: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Valor de referência normal'
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'itens_exame',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

module.exports = ItemExame;