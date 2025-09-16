const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Exame = sequelize.define('Exame', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    paciente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'pacientes',
            key: 'id'
        }
    },
    tipo_exame: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    data_exame: {
        type: DataTypes.DATE,
        allowNull: false
    },
    resultado: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    arquivo_resultado: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    laboratorio: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    medico_solicitante: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'exames',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

module.exports = Exame;