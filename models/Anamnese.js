const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Anamnese = sequelize.define('Anamnese', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    paciente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'pacientes',
            key: 'id'
        }
    },
    historico_familiar: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    doencas_preexistentes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    medicamentos_uso: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    alergias: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cirurgias_anteriores: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tratamentos_esteticos_anteriores: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    habitos_vida: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tipo_pele: {
        type: DataTypes.ENUM('oleosa', 'seca', 'mista', 'normal', 'sensivel'),
        allowNull: true
    },
    fototipo: {
        type: DataTypes.ENUM('I', 'II', 'III', 'IV', 'V', 'VI'),
        allowNull: true
    },
    exposicao_solar: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    uso_cosmeticos: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ciclo_menstrual: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    gravidez_amamentacao: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    observacoes_gerais: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    objetivos_tratamento: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'anamneses',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

module.exports = Anamnese;