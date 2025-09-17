const { Agendamento, Paciente, Usuario, Produto, ItemAgendamento, Pagamento } = require('../models');
const { Op } = require('sequelize');

class AgendamentoController {
    // Buscar agendamentos com filtros
    static async buscarAgendamentos(req, res) {
        try {
            const { mes, ano, busca, page = 1, limit = 100, paciente_id, status, expandir_produtos } = req.query;
            
            let whereClause = {};
            
            // Filtro por paciente_id (da URL ou query)
            const pacienteIdParam = req.params.pacienteId || paciente_id;
            if (pacienteIdParam) {
                whereClause.paciente_id = pacienteIdParam;
            }
            
            // Filtro por status
            if (status) {
                whereClause.status = status;
            }
            
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
            
            // Processar agendamentos com campos virtuais
            let agendamentosProcessados;
            
            if (expandir_produtos === 'true') {
                // Expandir agendamentos para incluir todos os produtos dos itens (para sistema de fotos)
                agendamentosProcessados = [];
                
                agendamentos.forEach(agendamento => {
                    const agendamentoData = agendamento.toJSON();
                    
                    // Adicionar campos virtuais
                    if (agendamentoData.data_agendamento) {
                        const data = new Date(agendamentoData.data_agendamento);
                        agendamentoData.horario = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        agendamentoData.valor_total = agendamentoData.valor_final || agendamentoData.valor || 0;
                    }
                    
                    // Se tem produto direto, adicionar como está
                    if (agendamentoData.produto) {
                        agendamentosProcessados.push(agendamentoData);
                    }
                    // Se não tem produto direto mas tem itens, criar uma entrada para cada produto
                    else if (agendamentoData.itens && agendamentoData.itens.length > 0) {
                        agendamentoData.itens.forEach((item, index) => {
                            if (item.produto) {
                                const agendamentoComProduto = { ...agendamentoData };
                                agendamentoComProduto.produto = item.produto;
                                // Criar ID único para cada produto do mesmo agendamento
                                agendamentoComProduto.id = `${agendamentoData.id}_${index}`;
                                agendamentoComProduto.agendamento_original_id = agendamentoData.id;
                                agendamentosProcessados.push(agendamentoComProduto);
                            }
                        });
                    }
                    // Se não tem produto nem itens, adicionar mesmo assim
                    else {
                        agendamentosProcessados.push(agendamentoData);
                    }
                });
            } else {
                // Processamento normal (para página de agendamentos)
                agendamentosProcessados = agendamentos.map(agendamento => {
                    const agendamentoData = agendamento.toJSON();
                    
                    // Adicionar campos virtuais
                    if (agendamentoData.data_agendamento) {
                        const data = new Date(agendamentoData.data_agendamento);
                        agendamentoData.horario = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        agendamentoData.valor_total = agendamentoData.valor_final || agendamentoData.valor || 0;
                    }
                    
                    // Se não tem produto direto, usar o primeiro produto dos itens
                    if (!agendamentoData.produto && agendamentoData.itens && agendamentoData.itens.length > 0) {
                        const primeiroItem = agendamentoData.itens[0];
                        if (primeiroItem.produto) {
                            agendamentoData.produto = primeiroItem.produto;
                        }
                    }
                    
                    return agendamentoData;
                });
            }
            
            res.json({
                success: true,
                data: agendamentosProcessados,
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
                        }],
                        required: false
                    },
                    {
                        model: Pagamento,
                        as: 'pagamentos',
                        attributes: ['id', 'status', 'valor_final', 'data_pagamento'],
                        required: false
                    }
                ]
            });
            
            if (!agendamento) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }
            
            // Adicionar campos virtuais
            const agendamentoData = agendamento.toJSON();
            if (agendamentoData.data_agendamento) {
                const data = new Date(agendamentoData.data_agendamento);
                agendamentoData.horario = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                agendamentoData.valor_total = agendamentoData.valor_final || agendamentoData.valor || 0;
            }
            
            res.json({
                success: true,
                data: agendamentoData
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
    
    // Confirmar pagamento
    static async confirmarPagamento(req, res) {
        try {
            const { id } = req.params;
            const { valor_pago, metodo_pagamento = 'dinheiro' } = req.body;
            
            const agendamento = await Agendamento.findByPk(id, {
                include: [{
                    model: Paciente,
                    as: 'paciente',
                    attributes: ['id']
                }]
            });
            
            if (!agendamento) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }
            
            const valorFinal = valor_pago || agendamento.valor_final || agendamento.valor || 0;
            
            // Criar registro de pagamento
            const pagamento = await Pagamento.create({
                paciente_id: agendamento.paciente_id,
                agendamento_id: id,
                valor: valorFinal,
                desconto: 0,
                valor_final: valorFinal,
                forma_pagamento: metodo_pagamento,
                status: 'pago',
                data_pagamento: new Date()
            });
            
            res.json({
                success: true,
                message: 'Pagamento confirmado com sucesso',
                data: pagamento
            });
            
        } catch (error) {
            console.error('Erro ao confirmar pagamento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao confirmar pagamento'
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