const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pagamento = sequelize.define('Pagamento', {
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
    agendamento_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'agendamentos',
            key: 'id'
        }
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    desconto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    valor_final: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    forma_pagamento: {
        type: DataTypes.ENUM('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia', 'cheque'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pendente', 'pago', 'cancelado', 'estornado'),
        allowNull: false,
        defaultValue: 'pendente'
    },
    data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    data_pagamento: {
        type: DataTypes.DATE,
        allowNull: true
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    numero_parcela: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1
    },
    total_parcelas: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1
    }
}, {
    tableName: 'pagamentos',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    hooks: {
        beforeSave: (pagamento) => {
            if (pagamento.valor && pagamento.desconto !== null) {
                pagamento.valor_final = pagamento.valor - pagamento.desconto;
            }
        }
    }
});


module.exports = Pagamento;