const { Pagamento, Paciente, Usuario, Agendamento, Produto } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class FinanceiroController {
    // Página principal do financeiro
    static async pageFinanceiro(req, res) {
        try {
            const user = req.session.user;
            const { Clinica } = require('../models');
            
            // Buscar dados da clínica
            const clinica = await Clinica.findOne();
            
            res.render('pages/financeiro', {
                user: user,
                clinica: clinica || { nome: 'Clínica' },
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (error) {
            console.error('Erro ao carregar página financeira:', error);
            res.render('pages/financeiro', {
                user: req.session.user,
                clinica: { nome: 'Clínica' },
                error: ['Erro ao carregar dados financeiros']
            });
        }
    }

    // Buscar dados do dashboard financeiro
    static async buscarDashboardFinanceiro(req, res) {
        try {
            const { periodo = 'mes' } = req.query;
            
            // Definir período de busca
            let dataInicio, dataFim;
            const hoje = new Date();
            
            switch (periodo) {
                case 'hoje':
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
                    break;
                case 'semana':
                    const inicioSemana = new Date(hoje);
                    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                    dataInicio = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate());
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
                    break;
                case 'mes':
                default:
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                    break;
                case 'ano':
                    dataInicio = new Date(hoje.getFullYear(), 0, 1);
                    dataFim = new Date(hoje.getFullYear(), 11, 31, 23, 59, 59);
                    break;
            }

            // Buscar receitas (pagamentos confirmados)
            const receitas = await Pagamento.findAll({
                where: {
                    status: 'pago',
                    data_pagamento: {
                        [Op.between]: [dataInicio, dataFim]
                    }
                },
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['id', 'nome']
                    },
                    {
                        model: Usuario,
                        as: 'confirmador',
                        attributes: ['id', 'nome']
                    },
                    {
                        model: Agendamento,
                        as: 'agendamento',
                        attributes: ['id', 'data_agendamento'],
                        include: [
                            {
                                model: Produto,
                                as: 'produto',
                                attributes: ['id', 'nome']
                            },
                            {
                                model: require('../models').ItemAgendamento,
                                as: 'itens',
                                attributes: ['quantidade', 'valor_unitario'],
                                include: [{
                                    model: Produto,
                                    as: 'produto',
                                    attributes: ['id', 'nome']
                                }]
                            }
                        ]
                    }
                ],
                order: [['data_pagamento', 'DESC']]
            });

            // Buscar agendamentos sem pagamento para criar pendências
            const agendamentosSemPagamento = await Agendamento.findAll({
                where: {
                    status: ['agendado', 'confirmado', 'concluido'],
                    [Op.and]: [
                        sequelize.literal('NOT EXISTS (SELECT 1 FROM pagamentos WHERE pagamentos.agendamento_id = Agendamento.id)')
                    ]
                },
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['id', 'nome']
                    }
                ]
            });

            // Criar pagamentos pendentes para agendamentos sem pagamento
            for (const agendamento of agendamentosSemPagamento) {
                if (agendamento.valor_final && agendamento.valor_final > 0) {
                    await Pagamento.create({
                        paciente_id: agendamento.paciente_id,
                        agendamento_id: agendamento.id,
                        valor: agendamento.valor_final,
                        desconto: agendamento.desconto || 0,
                        valor_final: agendamento.valor_final,
                        forma_pagamento: 'dinheiro',
                        status: 'pendente'
                    });
                }
            }

            // Buscar pagamentos pendentes
            const pendentes = await Pagamento.findAll({
                where: {
                    status: 'pendente'
                },
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['id', 'nome']
                    },
                    {
                        model: Agendamento,
                        as: 'agendamento',
                        attributes: ['id', 'data_agendamento'],
                        include: [
                            {
                                model: Produto,
                                as: 'produto',
                                attributes: ['id', 'nome']
                            },
                            {
                                model: require('../models').ItemAgendamento,
                                as: 'itens',
                                attributes: ['quantidade', 'valor_unitario'],
                                include: [{
                                    model: Produto,
                                    as: 'produto',
                                    attributes: ['id', 'nome']
                                }]
                            }
                        ]
                    }
                ],
                order: [['criado_em', 'DESC']]
            });

            // Calcular totais
            const totalReceitas = receitas.reduce((sum, pagamento) => sum + parseFloat(pagamento.valor_final), 0);
            const totalPendentes = pendentes.reduce((sum, pagamento) => sum + parseFloat(pagamento.valor_final), 0);

            // Agrupar receitas por procedimento/produto
            const receitasPorProcedimento = {};
            receitas.forEach(pagamento => {
                let procedimentos = [];
                
                // Verificar se há itens do agendamento (produtos específicos)
                if (pagamento.agendamento?.itens && pagamento.agendamento.itens.length > 0) {
                    procedimentos = pagamento.agendamento.itens.map(item => item.produto?.nome).filter(nome => nome);
                }
                
                // Se não há itens, usar o produto do agendamento principal
                if (procedimentos.length === 0 && pagamento.agendamento?.produto?.nome) {
                    procedimentos = [pagamento.agendamento.produto.nome];
                }
                
                // Se ainda não há procedimentos, usar nome genérico
                if (procedimentos.length === 0) {
                    procedimentos = ['Procedimento Não Especificado'];
                }
                
                // Distribuir o valor entre os procedimentos
                const valorPorProcedimento = parseFloat(pagamento.valor_final) / procedimentos.length;
                
                procedimentos.forEach(procedimento => {
                    if (!receitasPorProcedimento[procedimento]) {
                        receitasPorProcedimento[procedimento] = { total: 0, quantidade: 0 };
                    }
                    receitasPorProcedimento[procedimento].total += valorPorProcedimento;
                    receitasPorProcedimento[procedimento].quantidade += 1;
                });
            });

            // Dados para gráficos (receitas por dia)
            const receitasPorDia = {};
            receitas.forEach(pagamento => {
                const dia = new Date(pagamento.data_pagamento).toISOString().split('T')[0];
                if (!receitasPorDia[dia]) {
                    receitasPorDia[dia] = 0;
                }
                receitasPorDia[dia] += parseFloat(pagamento.valor_final);
            });

            res.json({
                success: true,
                data: {
                    periodo,
                    dataInicio,
                    dataFim,
                    resumo: {
                        totalReceitas,
                        totalPendentes,
                        quantidadeReceitas: receitas.length,
                        quantidadePendentes: pendentes.length
                    },
                    receitas,
                    pendentes,
                    receitasPorProcedimento,
                    receitasPorDia
                }
            });

        } catch (error) {
            console.error('Erro ao buscar dados financeiros:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar dados financeiros'
            });
        }
    }

    // Buscar relatório detalhado de pagamentos
    static async buscarRelatorioDetalhado(req, res) {
        try {
            const { 
                dataInicio, 
                dataFim, 
                status, 
                formaPagamento, 
                pacienteId,
                page = 1, 
                limit = 50 
            } = req.query;

            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;

            // Construir filtros
            const where = {};

            if (dataInicio && dataFim) {
                where.data_pagamento = {
                    [Op.between]: [new Date(dataInicio), new Date(dataFim + ' 23:59:59')]
                };
            }

            if (status) {
                where.status = status;
            }

            if (formaPagamento) {
                where.forma_pagamento = formaPagamento;
            }

            if (pacienteId) {
                where.paciente_id = pacienteId;
            }

            const { count, rows: pagamentos } = await Pagamento.findAndCountAll({
                where,
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['id', 'nome', 'cpf']
                    },
                    {
                        model: Usuario,
                        as: 'confirmador',
                        attributes: ['id', 'nome']
                    },
                    {
                        model: Agendamento,
                        as: 'agendamento',
                        attributes: ['id', 'data_agendamento'],
                        include: [
                            {
                                model: Produto,
                                as: 'produto',
                                attributes: ['id', 'nome']
                            },
                            {
                                model: Usuario,
                                as: 'profissional',
                                attributes: ['id', 'nome']
                            }
                        ]
                    }
                ],
                order: [['data_pagamento', 'DESC']],
                limit: limitNum,
                offset
            });

            const totalPages = Math.ceil(count / limitNum);

            res.json({
                success: true,
                data: {
                    pagamentos,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: count,
                        itemsPerPage: limitNum
                    }
                }
            });

        } catch (error) {
            console.error('Erro ao buscar relatório detalhado:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar relatório detalhado'
            });
        }
    }
}

module.exports = FinanceiroController;