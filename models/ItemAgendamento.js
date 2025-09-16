const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ItemAgendamento = sequelize.define('ItemAgendamento', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    agendamento_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'agendamentos',
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
        defaultValue: 1
    },
    valor_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    desconto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    valor_total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'itens_agendamento',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    hooks: {
        beforeSave: (item) => {
            if (item.valor_unitario && item.quantidade) {
                const desconto = item.desconto || 0;
                item.valor_total = (item.valor_unitario * item.quantidade) - desconto;
            }
        }
    }
});

module.exports = ItemAgendamento;