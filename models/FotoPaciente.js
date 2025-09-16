const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FotoPaciente = sequelize.define('FotoPaciente', {
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
    procedimento_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'agendamentos',
            key: 'id'
        }
    },
    titulo: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    momento_procedimento: {
        type: DataTypes.ENUM('antes', 'durante', 'depois'),
        allowNull: false
    },
    foto: {
        type: DataTypes.BLOB('long'),
        allowNull: false
    },
    tipo_arquivo: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'jpg'
    },
    tamanho_arquivo: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    data_foto: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'fotos_pacientes',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

module.exports = FotoPaciente;