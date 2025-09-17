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
                            },
                            {
                                model: require('../models').ItemAgendamento,
                                as: 'itens',
                                attributes: ['quantidade', 'valor_unitario', 'valor_total'],
                                include: [{
                                    model: Produto,
                                    as: 'produto',
                                    attributes: ['id', 'nome']
                                }]
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

    // Buscar pagamentos de um paciente específico
    static async buscarPagamentosPaciente(req, res) {
        try {
            const { id } = req.params;

            const pagamentos = await Pagamento.findAll({
                where: {
                    paciente_id: id
                },
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

            res.json({
                success: true,
                data: pagamentos
            });

        } catch (error) {
            console.error('Erro ao buscar pagamentos do paciente:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar pagamentos do paciente'
            });
        }
    }

    // Gerar comprovante de pagamento em PDF
    static async gerarComprovante(req, res) {
        try {
            // Processar dados do formulário ou JSON
            let paciente, pagamentos;
            
            if (req.body.paciente && typeof req.body.paciente === 'string') {
                // Dados vindos do formulário HTML
                paciente = JSON.parse(req.body.paciente);
                pagamentos = JSON.parse(req.body.pagamentos);
            } else {
                // Dados vindos do JSON (fallback)
                paciente = req.body.paciente;
                pagamentos = req.body.pagamentos;
            }
            const { Clinica } = require('../models');

            // Buscar dados da clínica
            const clinica = await Clinica.findOne();

            // Buscar pagamentos selecionados
            const pagamentosSelecionados = await Pagamento.findAll({
                where: {
                    id: pagamentos
                },
                include: [
                    {
                        model: Paciente,
                        as: 'paciente',
                        attributes: ['id', 'nome', 'cpf', 'telefone', 'email']
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
                            },
                            {
                                model: require('../models').ItemAgendamento,
                                as: 'itens',
                                attributes: ['quantidade', 'valor_unitario', 'valor_total'],
                                include: [{
                                    model: Produto,
                                    as: 'produto',
                                    attributes: ['id', 'nome']
                                }]
                            }
                        ]
                    }
                ],
                order: [['data_pagamento', 'ASC']]
            });

            // Verificar se encontrou pagamentos
            if (!pagamentosSelecionados || pagamentosSelecionados.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Nenhum pagamento encontrado com os IDs fornecidos'
                });
            }

            // Validar dados antes de gerar HTML
            const pacienteData = pagamentosSelecionados[0]?.paciente;
            if (!pacienteData) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do paciente não encontrados nos pagamentos selecionados'
                });
            }

            // Gerar HTML do comprovante
            const htmlComprovante = FinanceiroController.gerarHtmlComprovante(clinica, pacienteData, pagamentosSelecionados);
            
            // Validar se o HTML foi gerado corretamente
            if (!htmlComprovante || htmlComprovante.length < 100) {
                console.error('HTML gerado é muito pequeno ou vazio');
                return res.status(500).json({
                    success: false,
                    message: 'Erro na geração do HTML do comprovante'
                });
            }
            
            console.log('HTML gerado com sucesso, iniciando conversão para PDF...');
            console.log('Tamanho do HTML:', htmlComprovante.length, 'caracteres');

            // Retornar HTML para impressão no navegador
            console.log('Retornando HTML para impressão no navegador');
            
            // Adicionar estilos específicos para impressão
            const htmlCompletoParaImpressao = htmlComprovante.replace(
                '</head>',
                `
                <style media="print">
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                </style>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
                </head>`
            );
            
            // Enviar HTML para o navegador
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(htmlCompletoParaImpressao);

        } catch (error) {
            console.error('Erro ao gerar comprovante:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar comprovante'
            });
        }
    }

    // Função para escapar caracteres HTML
    static escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Gerar HTML do comprovante
    static gerarHtmlComprovante(clinica, paciente, pagamentos) {
        const totalGeral = pagamentos.reduce((sum, p) => sum + parseFloat(p.valor_final), 0);
        const dataEmissao = new Date().toLocaleDateString('pt-BR');
        
        // Escapar dados para evitar problemas no HTML
        const clinicaNome = FinanceiroController.escapeHtml(clinica?.nome || 'Clínica');
        const clinicaEndereco = FinanceiroController.escapeHtml(clinica?.endereco || '');
        const clinicaTelefone = FinanceiroController.escapeHtml(clinica?.telefone || '');
        const clinicaEmail = FinanceiroController.escapeHtml(clinica?.email || '');
        const pacienteNome = FinanceiroController.escapeHtml(paciente.nome);
        const pacienteCpf = FinanceiroController.escapeHtml(paciente.cpf);
        const pacienteTelefone = FinanceiroController.escapeHtml(paciente.telefone || 'Não informado');
        const pacienteEmail = FinanceiroController.escapeHtml(paciente.email || 'Não informado');
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Comprovante de Pagamento</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .clinica-nome {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2563eb;
                    margin-bottom: 5px;
                }
                .documento-titulo {
                    font-size: 18px;
                    font-weight: bold;
                    margin-top: 15px;
                }
                .info-section {
                    margin-bottom: 25px;
                }
                .info-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #2563eb;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 5px;
                }
                .info-row {
                    margin-bottom: 5px;
                }
                .table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .table th, .table td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }
                .table th {
                    background-color: #f8f9fa;
                    font-weight: bold;
                }
                .total-row {
                    background-color: #f0f9ff;
                    font-weight: bold;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #6b7280;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 20px;
                }
                .status-pago {
                    color: #059669;
                    font-weight: bold;
                }
                .status-pendente {
                    color: #d97706;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="clinica-nome">${clinicaNome}</div>
                <div>${clinicaEndereco}</div>
                <div>${clinicaTelefone}${clinicaTelefone && clinicaEmail ? ' | ' : ''}${clinicaEmail}</div>
                <div class="documento-titulo">COMPROVANTE DE PAGAMENTO</div>
            </div>

            <div class="info-section">
                <div class="info-title">Dados do Paciente</div>
                <div class="info-row"><strong>Nome:</strong> ${pacienteNome}</div>
                <div class="info-row"><strong>CPF:</strong> ${pacienteCpf}</div>
                <div class="info-row"><strong>Telefone:</strong> ${pacienteTelefone}</div>
                <div class="info-row"><strong>Email:</strong> ${pacienteEmail}</div>
            </div>

            <div class="info-section">
                <div class="info-title">Detalhes dos Pagamentos</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Procedimento</th>
                            <th>Profissional</th>
                            <th>Status</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagamentos.map(pagamento => {
                            const profissional = pagamento.agendamento?.profissional?.nome || 'Não informado';
                            const data = pagamento.data_pagamento ? 
                                new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR') : 
                                'Pendente';
                            const status = pagamento.status === 'pago' ? 
                                '<span class="status-pago">PAGO</span>' : 
                                '<span class="status-pendente">PENDENTE</span>';
                            
                            // Verificar se há itens do agendamento (múltiplos procedimentos)
                            let procedimentos = [];
                            if (pagamento.agendamento?.itens && pagamento.agendamento.itens.length > 0) {
                                procedimentos = pagamento.agendamento.itens.map(item => ({
                                    nome: FinanceiroController.escapeHtml(item.produto?.nome || 'Procedimento'),
                                    quantidade: item.quantidade || 1,
                                    valor: item.valor_total || item.valor_unitario || 0
                                }));
                            } else if (pagamento.agendamento?.produto?.nome) {
                                procedimentos = [{
                                    nome: FinanceiroController.escapeHtml(pagamento.agendamento.produto.nome),
                                    quantidade: 1,
                                    valor: pagamento.valor_final
                                }];
                            } else {
                                procedimentos = [{
                                    nome: 'Procedimento',
                                    quantidade: 1,
                                    valor: pagamento.valor_final
                                }];
                            }
                            
                            // Escapar dados do profissional
                            const profissionalEscapado = FinanceiroController.escapeHtml(profissional);
                            
                            // Gerar linhas para cada procedimento
                            return procedimentos.map((proc, index) => {
                                const isFirstRow = index === 0;
                                const valorFormatado = parseFloat(proc.valor || 0).toFixed(2).replace('.', ',');
                                return `
                                    <tr>
                                        <td>${isFirstRow ? data : ''}</td>
                                        <td>${proc.nome}${proc.quantidade > 1 ? ` (${proc.quantidade}x)` : ''}</td>
                                        <td>${isFirstRow ? profissionalEscapado : ''}</td>
                                        <td>${status}</td>
                                        <td>R$ ${valorFormatado}</td>
                                    </tr>
                                `;
                            }).join('');
                        }).join('')}
                        <tr class="total-row">
                            <td colspan="4"><strong>TOTAL GERAL</strong></td>
                            <td><strong>R$ ${totalGeral.toFixed(2).replace('.', ',')}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="footer">
                <p>Comprovante emitido em ${dataEmissao}</p>
                <p>Este documento comprova os pagamentos realizados pelos procedimentos listados acima.</p>
                <p>${clinicaNome} - Todos os direitos reservados</p>
            </div>
        </body>
        </html>`;
    }
}

module.exports = FinanceiroController;