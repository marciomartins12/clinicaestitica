const { Agendamento, Paciente, Usuario, Produto, ItemAgendamento, Pagamento, sequelize } = require('../models');
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

            // Regras de visibilidade na evolução: profissionais veem seus agendamentos e os sem profissional
            const currentUser = req.session?.user;
            if (req.originalUrl.includes('/atendimento/evolucao/') && currentUser && currentUser.tipo_usuario === 'profissional') {
                whereClause[Op.or] = [
                    { profissional_id: currentUser.id },
                    { profissional_id: null }
                ];
            }
            
            // Filtro "minha agenda" (profissional): a partir de hoje, meus agendamentos e sem profissional
            const minhaAgenda = req.query.minhaAgenda === 'true';
            if (minhaAgenda && currentUser && currentUser.tipo_usuario === 'profissional') {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                // Aplicar filtro de data a partir de hoje se não houver um intervalo explícito
                whereClause.data_agendamento = {
                    ...(whereClause.data_agendamento || {}),
                    [Op.gte]: hoje
                };
                // Garantir que pegue meus e sem profissional
                if (!whereClause[Op.or]) {
                    whereClause[Op.or] = [
                        { profissional_id: currentUser.id },
                        { profissional_id: null }
                    ];
                }
            }
            
            // Ocultar agendamentos finalizados com pagamento confirmado
            const ocultarFinalizadoPago = sequelize.literal("NOT (Agendamento.status = 'finalizado' AND EXISTS (SELECT 1 FROM pagamentos p WHERE p.agendamento_id = Agendamento.id AND p.status = 'pago'))");
            whereClause[Op.and] = whereClause[Op.and] ? [...whereClause[Op.and], ocultarFinalizadoPago] : [ocultarFinalizadoPago];
            
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
                    attributes: ['id', 'status', 'valor_final', 'data_pagamento', 'confirmado_por'],
                    include: [{
                        model: Usuario,
                        as: 'confirmador',
                        attributes: ['id', 'nome'],
                        required: false
                    }],
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
              
                agendamentosProcessados = agendamentos.map(agendamento => {
                    const agendamentoData = agendamento.toJSON();
                    
                   
                    if (agendamentoData.data_agendamento) {
                        const data = new Date(agendamentoData.data_agendamento);
                        agendamentoData.horario = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        agendamentoData.valor_total = agendamentoData.valor_final || agendamentoData.valor || 0;
                    }
                    
               
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
                profissional_id: profissionalIdRaw,
                data_agendamento,
                observacoes,
                valor,
                desconto = 0,
                valor_final,
                itens = []
            } = req.body;
            
            // Normalizar profissional_id para permitir NULL (tratando 0 como NULL)
            const profissional_id = (function normalizeProfissionalId(v) {
                if (v === undefined || v === null) return null;
                if (typeof v === 'string') {
                    const t = v.trim().toLowerCase();
                    if (t === '' || t === 'null' || t === 'undefined') return null;
                    const n = Number(t);
                    if (!Number.isFinite(n)) return null;
                    return n === 0 ? null : n;
                }
                if (typeof v === 'number') {
                    if (!Number.isFinite(v)) return null;
                    return v === 0 ? null : v;
                }
                return null;
            })(profissionalIdRaw);
            
            // Validações básicas
            if (!paciente_id || !data_agendamento) {
                return res.status(400).json({
                    success: false,
                    message: 'Paciente e data são obrigatórios'
                });
            }
            
            // Verificar se o horário está disponível quando há profissional definido
            if (profissional_id) {
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
            }
            
            // Criar agendamento
            const novoAgendamento = await Agendamento.create({
                paciente_id,
                profissional_id, // pode ser null
                produto_id: null, // Não usamos mais produto_id único
                data_agendamento,
                observacoes,
                valor: valor || null,
                desconto,
                valor_final,
                status: 'aguardando'
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
            
            // Criar pagamento pendente se há valor
            if (valor_final && valor_final > 0) {
                await Pagamento.create({
                    paciente_id,
                    agendamento_id: novoAgendamento.id,
                    valor: valor_final,
                    desconto: desconto || 0,
                    valor_final,
                    forma_pagamento: 'dinheiro', // Padrão
                    status: 'pendente'
                });
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
            // Normalizar profissional_id para permitir NULL (tratando 0 como NULL)
            const profissionalIdNormalizado = (function normalizeProfissionalId(v) {
                if (v === undefined || v === null) return null;
                if (typeof v === 'string') {
                    const t = v.trim().toLowerCase();
                    if (t === '' || t === 'null' || t === 'undefined') return null;
                    const n = Number(t);
                    if (!Number.isFinite(n)) return null;
                    return n === 0 ? null : n;
                }
                if (typeof v === 'number') {
                    if (!Number.isFinite(v)) return null;
                    return v === 0 ? null : v;
                }
                return null;
            })(profissional_id);
            
            if (data_agendamento && (data_agendamento !== agendamento.data_agendamento || profissionalIdNormalizado !== agendamento.profissional_id)) {
                if (profissionalIdNormalizado) {
                    const agendamentoExistente = await Agendamento.findOne({
                        where: {
                            profissional_id: profissionalIdNormalizado,
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
            }
            
            // Calcular valor final
            const valor_final = valor ? (parseFloat(valor) - parseFloat(desconto)) : agendamento.valor_final;
            
            // Ajustar status automaticamente ao reagendar (mudar data/hora ou profissional)
            let statusAtualizado = agendamento.status;
            const mudouHorario = !!(data_agendamento && data_agendamento !== agendamento.data_agendamento);
            const mudouProfissional = profissionalIdNormalizado !== agendamento.profissional_id;
            if (mudouHorario || mudouProfissional) {
                // Se não está cancelado ou faltou, volta para "aguardando"
                if (!['cancelado', 'faltou'].includes(statusAtualizado)) {
                    statusAtualizado = 'aguardando';
                }
            }
            
            // Atualizar agendamento
            const agoraStr = new Date().toLocaleString('pt-BR');
            let observacoesParaSalvar = (observacoes !== undefined ? observacoes : agendamento.observacoes);
            if (mudouHorario || mudouProfissional) {
                const marcador = `REAGENDADO EM: ${agoraStr}`;
                observacoesParaSalvar = `${observacoesParaSalvar ? observacoesParaSalvar + '\n' : ''}${marcador}`;
            }
            await agendamento.update({
                paciente_id: paciente_id || agendamento.paciente_id,
                profissional_id: profissional_id !== undefined ? profissionalIdNormalizado : agendamento.profissional_id,
                produto_id: produto_id || agendamento.produto_id,
                data_agendamento: data_agendamento || agendamento.data_agendamento,
                observacoes: observacoesParaSalvar,
                valor: valor !== undefined ? valor : agendamento.valor,
                desconto: desconto !== undefined ? desconto : agendamento.desconto,
                valor_final,
                status: statusAtualizado
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
            
            const statusValidos = ['aguardando', 'consultando', 'finalizado', 'cancelado', 'faltou'];
            
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
            // Se cancelado, pagamentos voltam a ser pendentes
            if (status === 'cancelado') {
                await Pagamento.update(
                    { status: 'pendente', data_pagamento: null, confirmado_por: null },
                    {
                        where: {
                            agendamento_id: id,
                            status: { [Op.in]: ['pago'] }
                        }
                    }
                );
            }
 
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
            const usuarioId = req.session.user.id; // Capturar usuário que confirmou
            
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
            
            // Verificar se já existe pagamento pendente para este agendamento
            let pagamento = await Pagamento.findOne({
                where: {
                    agendamento_id: id,
                    status: 'pendente'
                }
            });
            
            if (pagamento) {
                // Atualizar pagamento existente
                await pagamento.update({
                    valor: valorFinal,
                    valor_final: valorFinal,
                    forma_pagamento: metodo_pagamento,
                    status: 'pago',
                    data_pagamento: new Date(),
                    confirmado_por: usuarioId
                });
            } else {
                // Criar novo registro de pagamento se não existir
                pagamento = await Pagamento.create({
                    paciente_id: agendamento.paciente_id,
                    agendamento_id: id,
                    valor: valorFinal,
                    desconto: 0,
                    valor_final: valorFinal,
                    forma_pagamento: metodo_pagamento,
                    status: 'pago',
                    data_pagamento: new Date(),
                    confirmado_por: usuarioId
                });
            }
            
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
    
    // Reagendar agendamento que está com status 'faltou' criando um novo registro
    static async reagendarAgendamento(req, res) {
        try {
            const { id } = req.params;
            const { data_agendamento, profissional_id: profissionalIdRaw } = req.body;

            if (!data_agendamento) {
                return res.status(400).json({ success: false, message: 'Nova data/horário é obrigatória para reagendar' });
            }

            const agendamentoOriginal = await Agendamento.findByPk(id, {
                include: [
                    { model: Paciente, as: 'paciente', attributes: ['id', 'nome'] },
                    { model: Usuario, as: 'profissional', attributes: ['id', 'nome'], required: false },
                    { model: ItemAgendamento, as: 'itens', required: false },
                    { model: Pagamento, as: 'pagamentos', required: false }
                ]
            });

            if (!agendamentoOriginal) {
                return res.status(404).json({ success: false, message: 'Agendamento original não encontrado' });
            }

            if (agendamentoOriginal.status !== 'faltou') {
                return res.status(400).json({ success: false, message: 'Somente agendamentos com status "faltou" podem ser reagendados por este fluxo' });
            }

            // Normalizar profissional_id; se não vier, mantém o mesmo do original
            const profissional_id = (function normalizeProfissionalId(v, fallback) {
                if (v === undefined || v === null) return fallback || null;
                if (typeof v === 'string') {
                    const t = v.trim().toLowerCase();
                    if (t === '' || t === 'null' || t === 'undefined') return fallback || null;
                    const n = Number(t);
                    if (!Number.isFinite(n)) return fallback || null;
                    return n === 0 ? null : n;
                }
                if (typeof v === 'number') {
                    if (!Number.isFinite(v)) return fallback || null;
                    return v === 0 ? null : v;
                }
                return fallback || null;
            })(profissionalIdRaw, agendamentoOriginal.profissional_id);

            // Verificar conflito de horário para profissional (se houver)
            if (profissional_id) {
                const conflito = await Agendamento.findOne({
                    where: {
                        profissional_id,
                        data_agendamento,
                        status: { [Op.notIn]: ['cancelado', 'faltou'] }
                    }
                });
                if (conflito) {
                    return res.status(400).json({ success: false, message: 'Já existe um agendamento para este profissional neste horário' });
                }
            }

            // Criar novo agendamento copiando dados
            const dataReagendamento = new Date();
            const dataReagendamentoStr = dataReagendamento.toLocaleString('pt-BR');
            const observacoesNovas = `${agendamentoOriginal.observacoes ? agendamentoOriginal.observacoes + '\n' : ''}REAGENDADO EM: ${dataReagendamentoStr} (ID origem: ${agendamentoOriginal.id})`;

            const novoAgendamento = await Agendamento.create({
                paciente_id: agendamentoOriginal.paciente_id,
                profissional_id,
                produto_id: null,
                data_agendamento,
                observacoes: observacoesNovas,
                valor: agendamentoOriginal.valor,
                desconto: agendamentoOriginal.desconto,
                valor_final: agendamentoOriginal.valor_final,
                status: 'aguardando'
            });

            // Atualizar observações do agendamento original para indicar que foi reagendado
            const obsOriginalAtualizada = `${agendamentoOriginal.observacoes ? agendamentoOriginal.observacoes + '\n' : ''}REAGENDADO PARA: ${novoAgendamento.id} EM: ${dataReagendamentoStr}`;
            await agendamentoOriginal.update({ observacoes: obsOriginalAtualizada });
            // Clonar itens do agendamento original
            if (agendamentoOriginal.itens && agendamentoOriginal.itens.length > 0) {
                for (const item of agendamentoOriginal.itens) {
                    await ItemAgendamento.create({
                        agendamento_id: novoAgendamento.id,
                        produto_id: item.produto_id,
                        quantidade: item.quantidade,
                        valor_unitario: item.valor_unitario,
                        desconto: item.desconto,
                        observacoes: item.observacoes || null
                    });
                }
            }

            // Mover pagamento pendente, se existir
            const pagamentoPendente = agendamentoOriginal.pagamentos?.find(p => p.status === 'pendente');
            if (pagamentoPendente) {
                await Pagamento.update(
                    { agendamento_id: novoAgendamento.id },
                    { where: { id: pagamentoPendente.id } }
                );
            }

            // Mover pagamentos relevantes (pendente ou pago) para o novo agendamento
            // Registros cancelados ou estornados permanecem vinculados ao original
            await Pagamento.update(
                { agendamento_id: novoAgendamento.id },
                {
                    where: {
                        agendamento_id: agendamentoOriginal.id,
                        status: { [Op.in]: ['pendente', 'pago'] }
                    }
                }
            );

            // Buscar novo agendamento com includes para resposta
            const novoAgendamentoCompleto = await Agendamento.findByPk(novoAgendamento.id, {
                include: [
                    { model: Paciente, as: 'paciente', attributes: ['id', 'nome'] },
                    { model: Usuario, as: 'profissional', attributes: ['id', 'nome'], required: false },
                    { model: ItemAgendamento, as: 'itens', include: [{ model: Produto, as: 'produto', attributes: ['id', 'nome', 'categoria', 'preco'] }] },
                    { model: Pagamento, as: 'pagamentos' }
                ]
            });

            return res.json({
                success: true,
                message: 'Agendamento reagendado criando um novo registro',
                data: novoAgendamentoCompleto
            });
        } catch (error) {
            console.error('Erro ao reagendar criando novo agendamento:', error);
            return res.status(500).json({ success: false, message: 'Erro ao reagendar agendamento', error: error.message });
        }
    }
}

module.exports = AgendamentoController;