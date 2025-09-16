const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Atestado = sequelize.define('Atestado', {
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
    profissional_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    tipo: {
        type: DataTypes.ENUM('atestado_medico', 'declaracao_comparecimento', 'laudo_medico'),
        allowNull: false
    },
    data_emissao: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    data_inicio: {
        type: DataTypes.DATE,
        allowNull: true
    },
    data_fim: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cid: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('ativo', 'expirado', 'cancelado'),
        allowNull: false,
        defaultValue: 'ativo'
    }
}, {
    tableName: 'atestados',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

module.exports = Atestado;