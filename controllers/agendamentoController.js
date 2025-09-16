const { Agendamento, Paciente, Usuario, Produto, ItemAgendamento, Pagamento } = require('../models');
const { Op } = require('sequelize');

class AgendamentoController {
    // Buscar agendamentos com filtros
    static async buscarAgendamentos(req, res) {
        try {
            const { mes, ano, busca, page = 1, limit = 10 } = req.query;
            
            let whereClause = {};
            
            // Filtro por mês e ano
            if (mes && ano) {
                const startDate = new Date(ano, mes - 1, 1);
                const endDate = new Date(ano, mes, 0, 23, 59, 59);
                
                whereClause.data_agendamento = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (ano) {
                const startDate = new Date(ano, 0, 1);
                const endDate = new Date(ano, 11, 31, 23, 59, 59);
                
                whereClause.data_agendamento = {
                    [Op.between]: [startDate, endDate]
                };
            }
            
            // Configurar include com filtro de busca
            const includeOptions = [
                {
                    model: Paciente,
                    as: 'paciente',
                    attributes: ['id', 'nome', 'cpf', 'telefone'],
                    where: busca ? {
                        [Op.or]: [
                            { nome: { [Op.like]: `%${busca}%` } },
                            { cpf: { [Op.like]: `%${busca}%` } }
                        ]
                    } : undefined
                },
                {
                    model: Usuario,
                    as: 'profissional',
                    attributes: ['id', 'nome', 'especialidade']
                },
                {
                    model: Produto,
                    as: 'produto',
                    attributes: ['id', 'nome', 'preco', 'duracao_minutos']
                },
                {
                    model: ItemAgendamento,
                    as: 'itens',
                    attributes: ['id', 'produto_id', 'quantidade', 'valor_unitario', 'desconto', 'valor_total'],
                    include: [{
                        model: Produto,
                        as: 'produto',
                        attributes: ['id', 'nome', 'categoria', 'preco']
                    }],
                    required: false
                },
                {
                    model: Pagamento,
                    as: 'pagamentos',
                    attributes: ['id', 'status', 'valor_final', 'data_pagamento'],
                    required: false
                }
            ];
            
            const offset = (page - 1) * limit;
            
            const { count, rows: agendamentos } = await Agendamento.findAndCountAll({
                where: whereClause,
                include: includeOptions,
                order: [['data_agendamento', 'ASC']],
                limit: parseInt(limit),
                offset: offset,
                distinct: true
            });
            
            const totalPages = Math.ceil(count / limit);
            
            res.json({
                success: true,
                data: agendamentos,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalRecords: count,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });
            
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar agendamentos',
                error: error.message
            });
        }
    }
    
    // Criar novo agendamento
    static async criarAgendamento(req, res) {
        try {
            const {
                paciente_id,
                profissional_id,
                data_agendamento,
                observacoes,
                valor,
                desconto = 0,
                valor_final,
                itens = []
            } = req.body;
            
            // Validações básicas
            if (!paciente_id || !profissional_id || !data_agendamento) {
                return res.status(400).json({
                    success: false,
                    message: 'Paciente, profissional e data são obrigatórios'
                });
            }
            
            // Verificar se o horário está disponível
            const agendamentoExistente = await Agendamento.findOne({
                where: {
                    profissional_id,
                    data_agendamento,
                    status: {
                        [Op.notIn]: ['cancelado', 'faltou']
                    }
                }
            });
            
            if (agendamentoExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um agendamento para este profissional neste horário'
                });
            }
            
            // Criar agendamento
            const novoAgendamento = await Agendamento.create({
                paciente_id,
                profissional_id,
                produto_id: null, // Não usamos mais produto_id único
                data_agendamento,
                observacoes,
                valor: valor || null,
                desconto,
                valor_final,
                status: 'agendado'
            });
            
            // Criar itens do agendamento se existirem
            if (itens.length > 0) {
                const { ItemAgendamento } = require('../models');
                
                for (const item of itens) {
                    await ItemAgendamento.create({
                        agendamento_id: novoAgendamento.id,
                        produto_id: item.produto_id,
                        quantidade: item.quantidade,
                        valor_unitario: item.valor_unitario,
                        desconto: item.desconto
                    });
                }
            }
            
            // Buscar agendamento criado com includes
            const agendamentoCriado = await Agendamento.findByPk(novoAgendamento.id, {
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['nome', 'cpf']
                    },
                    {
                        model: Usuario,
                        as: 'profissional',
                        attributes: ['nome']
                    },
                    {
                        model: Produto,
                        as: 'produto',
                        attributes: ['nome']
                    }
                ]
            });
            
            res.json({
                success: true,
                message: 'Agendamento criado com sucesso',
                data: agendamentoCriado
            });
            
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao criar agendamento',
                error: error.message
            });
        }
    }
    
    // Buscar pacientes para autocomplete
    static async buscarPacientes(req, res) {
        try {
            const { busca } = req.query;
            
            if (!busca || busca.length < 2) {
                return res.json({ success: true, data: [] });
            }
            
            const pacientes = await Paciente.findAll({
                where: {
                    status: 'ativo',
                    [Op.or]: [
                        { nome: { [Op.like]: `%${busca}%` } },
                        { cpf: { [Op.like]: `%${busca}%` } }
                    ]
                },
                attributes: ['id', 'nome', 'cpf', 'telefone'],
                limit: 10,
                order: [['nome', 'ASC']]
            });
            
            res.json({
                success: true,
                data: pacientes
            });
            
        } catch (error) {
            console.error('Erro ao buscar pacientes:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar pacientes'
            });
        }
    }
    
    // Buscar profissionais ativos
    static async buscarProfissionais(req, res) {
        try {
            const profissionais = await Usuario.findAll({
                where: {
                    status: 'ativo',
                    tipo_usuario: 'profissional'
                },
                attributes: ['id', 'nome', 'especialidade'],
                order: [['nome', 'ASC']]
            });
            
            res.json({
                success: true,
                data: profissionais
            });
            
        } catch (error) {
            console.error('Erro ao buscar profissionais:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar profissionais'
            });
        }
    }
    
    // Buscar produtos/procedimentos
    static async buscarProdutos(req, res) {
        try {
            const produtos = await Produto.findAll({
                where: {
                    status: 'ativo',
                    categoria: 'procedimento'
                },
                attributes: ['id', 'nome', 'preco', 'duracao_minutos'],
                order: [['nome', 'ASC']]
            });
            
            res.json({
                success: true,
                data: produtos
            });
            
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar produtos'
            });
        }
    }
    
    // Buscar todos os produtos (procedimentos, suplementos, etc.)
    static async buscarTodosProdutos(req, res) {
        try {
            const produtos = await Produto.findAll({
                where: {
                    status: 'ativo'
                },
                attributes: ['id', 'nome', 'categoria', 'preco', 'duracao_minutos'],
                order: [['categoria', 'ASC'], ['nome', 'ASC']]
            });
            
            res.json({
                success: true,
                data: produtos
            });
            
        } catch (error) {
            console.error('Erro ao buscar todos os produtos:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar produtos'
            });
        }
    }
    
    // Buscar agendamento por ID
    static async buscarAgendamentoPorId(req, res) {
        try {
            const { id } = req.params;
            
            const agendamento = await Agendamento.findByPk(id, {
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['id', 'nome', 'cpf', 'telefone']
                    },
                    {
                        model: Usuario,
                        as: 'profissional',
                        attributes: ['id', 'nome', 'especialidade']
                    },
                    {
                        model: Produto,
                        as: 'produto',
                        attributes: ['id', 'nome', 'preco', 'duracao_minutos']
                    },
                    {
                        model: ItemAgendamento,
                        as: 'itens',
                        attributes: ['id', 'produto_id', 'quantidade', 'valor_unitario', 'desconto', 'valor_total'],
                        include: [{
                            model: Produto,
                            as: 'produto',
                            attributes: ['id', 'nome', 'categoria', 'preco']
                        }]
                    }
                ]
            });
            
            if (!agendamento) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }
            
            res.json({
                success: true,
                data: agendamento
            });
            
        } catch (error) {
            console.error('Erro ao buscar agendamento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar agendamento'
            });
        }
    }
    
    // Atualizar agendamento
    static async atualizarAgendamento(req, res) {
        try {
            const { id } = req.params;
            const {
                paciente_id,
                profissional_id,
                produto_id,
                data_agendamento,
                observacoes,
                valor,
                desconto = 0
            } = req.body;
            
            const agendamento = await Agendamento.findByPk(id);
            
            if (!agendamento) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }
            
            // Verificar se o novo horário está disponível (exceto para o próprio agendamento)
            if (data_agendamento && (data_agendamento !== agendamento.data_agendamento || profissional_id !== agendamento.profissional_id)) {
                const agendamentoExistente = await Agendamento.findOne({
                    where: {
                        profissional_id,
                        data_agendamento,
                        status: {
                            [Op.notIn]: ['cancelado', 'faltou']
                        },
                        id: {
                            [Op.ne]: id
                        }
                    }
                });
                
                if (agendamentoExistente) {
                    return res.status(400).json({
                        success: false,
                        message: 'Já existe um agendamento para este profissional neste horário'
                    });
                }
            }
            
            // Calcular valor final
            const valor_final = valor ? (parseFloat(valor) - parseFloat(desconto)) : agendamento.valor_final;
            
            // Atualizar agendamento
            await agendamento.update({
                paciente_id: paciente_id || agendamento.paciente_id,
                profissional_id: profissional_id || agendamento.profissional_id,
                produto_id: produto_id || agendamento.produto_id,
                data_agendamento: data_agendamento || agendamento.data_agendamento,
                observacoes: observacoes !== undefined ? observacoes : agendamento.observacoes,
                valor: valor !== undefined ? valor : agendamento.valor,
                desconto: desconto !== undefined ? desconto : agendamento.desconto,
                valor_final
            });
            
            // Buscar agendamento atualizado com includes
            const agendamentoAtualizado = await Agendamento.findByPk(id, {
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['nome', 'cpf']
                    },
                    {
                        model: Usuario,
                        as: 'profissional',
                        attributes: ['nome']
                    },
                    {
                        model: Produto,
                        as: 'produto',
                        attributes: ['nome']
                    }
                ]
            });
            
            res.json({
                success: true,
                message: 'Agendamento atualizado com sucesso',
                data: agendamentoAtualizado
            });
            
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar agendamento',
                error: error.message
            });
        }
    }
    
    // Alterar status do agendamento
    static async alterarStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            const statusValidos = ['agendado', 'confirmado', 'concluido', 'cancelado', 'faltou'];
            
            if (!statusValidos.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Status inválido'
                });
            }
            
            const agendamento = await Agendamento.findByPk(id);
            
            if (!agendamento) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }
            
            await agendamento.update({ status });
            
            res.json({
                success: true,
                message: `Status alterado para: ${status}`,
                data: agendamento
            });
            
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao alterar status'
            });
        }
    }
    
    // Excluir agendamento
    static async excluirAgendamento(req, res) {
        try {
            const { id } = req.params;
            
            const agendamento = await Agendamento.findByPk(id);
            
            if (!agendamento) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }
            
            // Verificar se há pagamentos associados
            const { Pagamento } = require('../models');
            const pagamentosAssociados = await Pagamento.findAll({
                where: { agendamento_id: id }
            });
            
            // Se há pagamentos, excluir primeiro
            if (pagamentosAssociados.length > 0) {
                await Pagamento.destroy({
                    where: { agendamento_id: id }
                });
            }
            
            // Agora excluir o agendamento
            await agendamento.destroy();
            
            res.json({
                success: true,
                message: 'Agendamento excluído com sucesso'
            });
            
        } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            
            // Tratar erro específico de constraint
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'Não é possível excluir este agendamento pois há registros relacionados (pagamentos, etc.)'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Erro ao excluir agendamento: ' + error.message
            });
        }
    }
}

module.exports = AgendamentoController;