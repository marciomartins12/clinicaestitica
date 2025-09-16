const { Paciente, Clinica } = require('../models');
const { Op } = require('sequelize');

class PacienteController {
    static async pagePaciente(req, res) {
        try {
            const user = req.session.user;
            
            // Buscar dados da clínica
            const clinica = await Clinica.findOne();
            
            res.render('pages/paciente', {
                user: user,
                clinica: clinica || { nome: 'Clínica' }
            });
        } catch (error) {
            console.error('Erro ao carregar página de pacientes:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }

    // Buscar pacientes com filtros e paginação
    static async buscarPacientes(req, res) {
        try {
            const { page = 1, limit = 10, busca, status, ordenar } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;

            // Construir condições de busca
            const where = {};
            
            if (status) {
                where.status = status;
            }

            if (busca) {
                where[Op.or] = [
                    { nome: { [Op.like]: `%${busca}%` } },
                    { cpf: { [Op.like]: `%${busca}%` } },
                    { telefone: { [Op.like]: `%${busca}%` } },
                    { email: { [Op.like]: `%${busca}%` } }
                ];
            }

            // Definir ordenação
            let order = [['nome', 'ASC']];
            if (ordenar === 'nome') {
                order = [['nome', 'ASC']];
            } else if (ordenar === 'data') {
                order = [['criado_em', 'DESC']];
            } else if (ordenar === 'ultimaVisita') {
                // Para implementar depois com relacionamento de agendamentos
                order = [['atualizado_em', 'DESC']];
            }

            const { count, rows } = await Paciente.findAndCountAll({
                where,
                order,
                limit: limitNum,
                offset: offset
            });

            const totalPages = Math.ceil(count / limitNum);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalRecords: count,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            });
        } catch (error) {
            console.error('Erro ao buscar pacientes:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar pacientes' });
        }
    }

    // Criar novo paciente
    static async criarPaciente(req, res) {
        try {
            const {
                nome,
                email,
                cpf,
                rg,
                telefone,
                data_nascimento,
                endereco,
                profissao,
                estado_civil,
                contato_emergencia,
                telefone_emergencia,
                convenio_medico,
                numero_convenio,
                observacoes
            } = req.body;

            // Validações básicas
            if (!nome || !cpf) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome e CPF são obrigatórios'
                });
            }

            // Verificar se CPF já existe
            const cpfExiste = await Paciente.cpfExiste(cpf);
            if (cpfExiste) {
                return res.status(400).json({
                    success: false,
                    message: 'CPF já cadastrado no sistema'
                });
            }

            const novoPaciente = await Paciente.create({
                nome,
                email,
                cpf,
                rg,
                telefone,
                data_nascimento,
                endereco,
                profissao,
                estado_civil,
                contato_emergencia,
                telefone_emergencia,
                convenio_medico,
                numero_convenio,
                observacoes,
                status: 'ativo'
            });

            res.status(201).json({
                success: true,
                message: 'Paciente cadastrado com sucesso',
                data: novoPaciente
            });
        } catch (error) {
            console.error('Erro ao criar paciente:', error);
            
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors.map(e => e.message)
                });
            }
            
            res.status(500).json({ success: false, message: 'Erro ao cadastrar paciente' });
        }
    }

    // Buscar paciente por ID
    static async buscarPacientePorId(req, res) {
        try {
            const { id } = req.params;
            
            const paciente = await Paciente.findByPk(id);
            
            if (!paciente) {
                return res.status(404).json({
                    success: false,
                    message: 'Paciente não encontrado'
                });
            }

            res.json({
                success: true,
                data: paciente
            });
        } catch (error) {
            console.error('Erro ao buscar paciente:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar paciente' });
        }
    }

    // Atualizar paciente
    static async atualizarPaciente(req, res) {
        try {
            const { id } = req.params;
            const {
                nome,
                email,
                cpf,
                rg,
                telefone,
                data_nascimento,
                endereco,
                profissao,
                estado_civil,
                contato_emergencia,
                telefone_emergencia,
                convenio_medico,
                numero_convenio,
                observacoes,
                status
            } = req.body;

            const paciente = await Paciente.findByPk(id);
            
            if (!paciente) {
                return res.status(404).json({
                    success: false,
                    message: 'Paciente não encontrado'
                });
            }

            // Verificar se CPF já existe (excluindo o próprio paciente)
            if (cpf && cpf !== paciente.cpf) {
                const cpfExiste = await Paciente.cpfExiste(cpf, id);
                if (cpfExiste) {
                    return res.status(400).json({
                        success: false,
                        message: 'CPF já cadastrado para outro paciente'
                    });
                }
            }

            await paciente.update({
                nome,
                email,
                cpf,
                rg,
                telefone,
                data_nascimento,
                endereco,
                profissao,
                estado_civil,
                contato_emergencia,
                telefone_emergencia,
                convenio_medico,
                numero_convenio,
                observacoes,
                status
            });

            res.json({
                success: true,
                message: 'Paciente atualizado com sucesso',
                data: paciente
            });
        } catch (error) {
            console.error('Erro ao atualizar paciente:', error);
            
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors.map(e => e.message)
                });
            }
            
            res.status(500).json({ success: false, message: 'Erro ao atualizar paciente' });
        }
    }

    // Excluir paciente (desativar)
    static async excluirPaciente(req, res) {
        try {
            const { id } = req.params;
            
            const paciente = await Paciente.findByPk(id);
            
            if (!paciente) {
                return res.status(404).json({
                    success: false,
                    message: 'Paciente não encontrado'
                });
            }

            // Desativar ao invés de excluir fisicamente
            await paciente.desativar();

            res.json({
                success: true,
                message: 'Paciente desativado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao excluir paciente:', error);
            res.status(500).json({ success: false, message: 'Erro ao excluir paciente' });
        }
    }

    // Buscar pacientes para seleção (usado em outros módulos)
    static async buscarPacientesParaSelecao(req, res) {
        try {
            const { busca } = req.query;
            
            const where = { status: 'ativo' };
            
            if (busca) {
                where[Op.or] = [
                    { nome: { [Op.like]: `%${busca}%` } },
                    { cpf: { [Op.like]: `%${busca}%` } }
                ];
            }

            const pacientes = await Paciente.findAll({
                where,
                attributes: ['id', 'nome', 'cpf', 'telefone'],
                order: [['nome', 'ASC']],
                limit: 10
            });

            res.json({
                success: true,
                data: pacientes
            });
        } catch (error) {
            console.error('Erro ao buscar pacientes para seleção:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar pacientes' });
        }
    }
}

module.exports = PacienteController;