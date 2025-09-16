const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Paciente = sequelize.define('Paciente', {
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
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    cpf: {
        type: DataTypes.STRING(14),
        allowNull: false,
        unique: true,
        validate: {
            len: [11, 14]
        }
    },
    rg: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    telefone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    data_nascimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    endereco: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    profissao: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    estado_civil: {
        type: DataTypes.ENUM('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'),
        allowNull: true
    },
    contato_emergencia: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    telefone_emergencia: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    convenio_medico: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    numero_convenio: {
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
    tableName: 'pacientes',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
});

// Métodos estáticos
Paciente.buscarPorCpf = async function(cpf) {
    try {
        return await Paciente.findOne({
            where: {
                cpf: cpf,
                status: 'ativo'
            }
        });
    } catch (error) {
        console.error('Erro ao buscar paciente por CPF:', error);
        throw error;
    }
};

Paciente.listarAtivos = async function(filtros = {}) {
    try {
        const where = { status: 'ativo' };
        
        if (filtros.busca) {
            where[sequelize.Sequelize.Op.or] = [
                { nome: { [sequelize.Sequelize.Op.like]: `%${filtros.busca}%` } },
                { email: { [sequelize.Sequelize.Op.like]: `%${filtros.busca}%` } },
                { cpf: { [sequelize.Sequelize.Op.like]: `%${filtros.busca}%` } }
            ];
        }
        
        return await Paciente.findAll({
            where,
            order: [['nome', 'ASC']]
        });
    } catch (error) {
        console.error('Erro ao listar pacientes ativos:', error);
        throw error;
    }
};

Paciente.cpfExiste = async function(cpf, excluirId = null) {
    try {
        const where = { cpf };
        if (excluirId) {
            where.id = { [sequelize.Sequelize.Op.ne]: excluirId };
        }
        
        const count = await Paciente.count({ where });
        return count > 0;
    } catch (error) {
        console.error('Erro ao verificar CPF:', error);
        throw error;
    }
};

// Métodos de instância
Paciente.prototype.desativar = async function() {
    try {
        this.status = 'inativo';
        await this.save();
        return true;
    } catch (error) {
        console.error('Erro ao desativar paciente:', error);
        throw error;
    }
};

module.exports = Paciente;