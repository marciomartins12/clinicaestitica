const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Agendamento = sequelize.define('Agendamento', {
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
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    produto_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'produtos',
            key: 'id'
        }
    },
    data_agendamento: {
        type: DataTypes.DATE,
        allowNull: false
    },
    data_realizacao: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('aguardando', 'consultando', 'finalizado', 'cancelado', 'faltou'),
        allowNull: true,
        defaultValue: null
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    desconto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    valor_final: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    motivo_cancelamento: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'agendamentos',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    hooks: {
        beforeSave: (agendamento) => {
            if (agendamento.valor && agendamento.desconto) {
                agendamento.valor_final = agendamento.valor - agendamento.desconto;
            }
        }
    }
});


module.exports = Agendamento;