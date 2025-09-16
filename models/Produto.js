const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Produto = sequelize.define('Produto', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    categoria: {
        type: DataTypes.ENUM('procedimento', 'medicamento', 'suplemento', 'combo'),
        allowNull: false
    },
    preco: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    duracao_minutos: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0
        }
    },
    codigo: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    },
    marca: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    fornecedor: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    estoque_atual: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    estoque_minimo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    unidade_medida: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    data_validade: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    lote: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('ativo', 'inativo'),
        allowNull: false,
        defaultValue: 'ativo'
    }
}, {
    tableName: 'produtos',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});


module.exports = Produto;