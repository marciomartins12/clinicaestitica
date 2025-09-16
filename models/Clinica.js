const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Clinica = sequelize.define('Clinica', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    cnpj: {
        type: DataTypes.STRING(18),
        allowNull: true,
        unique: true
    },
    endereco: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    telefone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    site: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    horario_funcionamento: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    especialidades: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    responsavel_tecnico: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    crm_responsavel: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    logo: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'clinica',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

module.exports = Clinica;