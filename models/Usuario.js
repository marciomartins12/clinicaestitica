const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Usuario = sequelize.define('Usuario', {
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
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    senha: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            len: [6, 255]
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
    tipo_usuario: {
        type: DataTypes.ENUM('profissional', 'atendente', 'admin'),
        allowNull: false,
        defaultValue: 'atendente'
    },
    status: {
        type: DataTypes.ENUM('ativo', 'inativo'),
        allowNull: false,
        defaultValue: 'ativo'
    },
    data_admissao: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    salario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    horario_trabalho: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    especialidade: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    registro: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    formacao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    certificacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    experiencia: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    setor: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    habilidades: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    hooks: {
        beforeCreate: async (usuario) => {
            if (usuario.senha) {
                usuario.senha = await Usuario.criptografarSenha(usuario.senha);
            }
        },
        beforeUpdate: async (usuario) => {
            if (usuario.changed('senha')) {
                usuario.senha = await Usuario.criptografarSenha(usuario.senha);
            }
        }
    }
});

// Métodos de instância
Usuario.prototype.verificarSenha = async function(senha) {
    try {
        return await bcrypt.compare(senha, this.senha);
    } catch (error) {
        console.error('Erro ao verificar senha:', error);
        return false;
    }
};

Usuario.prototype.objetoSeguro = function() {
    const { senha, ...usuarioSeguro } = this.toJSON();
    return usuarioSeguro;
};

Usuario.prototype.ehProfissional = function() {
    return this.tipo_usuario === 'profissional';
};

Usuario.prototype.ehAtendente = function() {
    return this.tipo_usuario === 'atendente';
};

Usuario.prototype.ehAdmin = function() {
    return this.tipo_usuario === 'admin';
};

Usuario.prototype.desativar = async function() {
    try {
        this.status = 'inativo';
        await this.save();
        return true;
    } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        throw error;
    }
};

// Métodos estáticos
Usuario.criptografarSenha = async function(senha) {
    try {
        const saltRounds = 12;
        return await bcrypt.hash(senha, saltRounds);
    } catch (error) {
        console.error('Erro ao criptografar senha:', error);
        throw error;
    }
};

Usuario.buscarPorEmail = async function(email) {
    try {
        return await Usuario.findOne({
            where: {
                email: email,
                status: 'ativo'
            }
        });
    } catch (error) {
        console.error('Erro ao buscar usuário por email:', error);
        throw error;
    }
};

Usuario.buscarPorCpf = async function(cpf) {
    try {
        return await Usuario.findOne({
            where: {
                cpf: cpf,
                status: 'ativo'
            }
        });
    } catch (error) {
        console.error('Erro ao buscar usuário por CPF:', error);
        throw error;
    }
};

Usuario.listarTodos = async function(filtros = {}) {
    try {
        const where = { status: 'ativo' };
        
        if (filtros.tipo_usuario) {
            where.tipo_usuario = filtros.tipo_usuario;
        }
        
        const opcoes = {
            where,
            attributes: {
                exclude: ['senha']
            },
            order: [['nome', 'ASC']]
        };
        
        if (filtros.busca) {
            where[sequelize.Sequelize.Op.or] = [
                { nome: { [sequelize.Sequelize.Op.like]: `%${filtros.busca}%` } },
                { email: { [sequelize.Sequelize.Op.like]: `%${filtros.busca}%` } },
                { cpf: { [sequelize.Sequelize.Op.like]: `%${filtros.busca}%` } }
            ];
        }
        
        return await Usuario.findAll(opcoes);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        throw error;
    }
};

Usuario.emailExiste = async function(email, excluirId = null) {
    try {
        const where = { email };
        if (excluirId) {
            where.id = { [sequelize.Sequelize.Op.ne]: excluirId };
        }
        
        const count = await Usuario.count({ where });
        return count > 0;
    } catch (error) {
        console.error('Erro ao verificar email:', error);
        throw error;
    }
};

Usuario.cpfExiste = async function(cpf, excluirId = null) {
    try {
        const where = { cpf };
        if (excluirId) {
            where.id = { [sequelize.Sequelize.Op.ne]: excluirId };
        }
        
        const count = await Usuario.count({ where });
        return count > 0;
    } catch (error) {
        console.error('Erro ao verificar CPF:', error);
        throw error;
    }
};

module.exports = Usuario;