// Agenda JavaScript - Sistema de Clínica
// Variáveis globais
let paginaAtual = 1;
let totalPaginas = 1;
let agendamentoEditando = null;
let itensAgendamento = [];
let contadorItens = 0;
let todosProdutos = [];
let agendamentoReagendandoId = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    inicializarFiltros();
    carregarProfissionais();
    carregarTodosProdutos();
    buscarAgendamentos();
    
    // Event listeners
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Buscar ao pressionar Enter
    document.getElementById('buscaInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarAgendamentos();
        }
    });
    
    // Buscar paciente ao pressionar Enter
    document.getElementById('buscaPaciente').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarPacientes();
        }
    });
    
    // Fechar modal ao clicar fora
    document.getElementById('modalAgendamento').addEventListener('click', function(e) {
        if (e.target === this) {
            fecharModal();
        }
    });
    
    // Event listener delegado para botões de ação
    document.addEventListener('click', function(e) {
        const button = e.target.closest('button[data-action]');
        if (button) {
            e.preventDefault();
            e.stopPropagation();
            
            const action = button.getAttribute('data-action');
            const id = button.getAttribute('data-id');
            
            console.log(`Ação ${action} clicada para ID:`, id);
            
            switch(action) {
                case 'detalhes':
                    verDetalhesAgendamento(id);
                    break;
                case 'remarcar':
                    remarcarAgendamento(id);
                    break;
                case 'status':
                    alterarStatusAgendamento(id);
                    break;
                case 'editar':
                    editarProdutosAgendamento(id);
                    break;
                case 'excluir':
                    excluirAgendamento(id);
                    break;
            }
        }
    });
}

// ===== FUNÇÕES DE FILTROS E BUSCA =====

// Inicializar filtros com data atual
function inicializarFiltros() {
    let mesDoAno = new Date().getMonth() + 1;
    let anoEmQueEstamos = new Date().getFullYear();
    document.getElementById('mesSelect').value = mesDoAno;
    document.getElementById('anoSelect').value = anoEmQueEstamos;
}

// Buscar agendamentos
function buscarAgendamentos(pagina = 1) {
    const busca = document.getElementById('buscaInput').value;
    const mes = document.getElementById('mesSelect').value;
    const ano = document.getElementById('anoSelect').value;
    
    const params = new URLSearchParams({
        page: pagina,
        limit: 10
    });
    
    if (busca) params.append('busca', busca);
    if (mes) params.append('mes', mes);
    if (ano) params.append('ano', ano);
    
    mostrarLoading();
    
    fetch(`/sistema/agendamentos?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                exibirAgendamentos(data.data);
                atualizarPaginacao(data.pagination);
                document.getElementById('totalRegistros').textContent = `Total: ${data.pagination.totalRecords} agendamentos`;
            } else {
                mostrarErro('Erro ao carregar agendamentos');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            mostrarErro('Erro ao carregar agendamentos');
        })
        .finally(() => {
            ocultarLoading();
        });
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('buscaInput').value = '';
    document.getElementById('mesSelect').value = '';
    document.getElementById('anoSelect').value = '';
    buscarAgendamentos();
}

// ===== FUNÇÕES DE EXIBIÇÃO =====

// Exibir agendamentos na tabela
function exibirAgendamentos(agendamentos) {
    const tbody = document.getElementById('agendamentosTableBody');
    
    if (agendamentos.length === 0) {
        mostrarVazio();
        return;
    }
    
    tbody.innerHTML = agendamentos.map(agendamento => {
        const dataFormatada = new Date(agendamento.data_agendamento).toLocaleString('pt-BR');
        const valor = agendamento.valor_final ? `R$ ${parseFloat(agendamento.valor_final).toFixed(2).replace('.', ',')}` : '-';
        
        // Exibir itens do agendamento
        let itensTexto = '-';
        if (agendamento.itens && agendamento.itens.length > 0) {
            itensTexto = agendamento.itens.map(item => {
                const qtd = item.quantidade > 1 ? ` (${item.quantidade}x)` : '';
                return `${item.produto.nome}${qtd}`;
            }).join(', ');
        } else if (agendamento.produto?.nome) {
            itensTexto = agendamento.produto.nome;
        }
        
        return `
            <tr>
                <td>${dataFormatada}</td>
                <td>${agendamento.paciente?.nome || '-'}</td>
                <td>${agendamento.paciente?.cpf || '-'}</td>
                <td>${agendamento.profissional?.nome || '-'}</td>
                <td title="${itensTexto}">${itensTexto.length > 50 ? itensTexto.substring(0, 50) + '...' : itensTexto}</td>
                <td>${valor}</td>
                <td><span class="status-badge status-${agendamento.status}">${agendamento.status}</span></td>
                <td>${(() => {
                    if (!agendamento.pagamentos || agendamento.pagamentos.length === 0) {
                        return '<span class="payment-badge payment-pending">Não Pago</span>';
                    }
                    const pagamentoPago = agendamento.pagamentos.find(p => p.status === 'pago');
                    if (pagamentoPago) {
                        return '<span class="payment-badge payment-paid">Pago</span>';
                    } else {
                        return '<span class="payment-badge payment-pending">Não Pago</span>';
                    }
                })()}</td>
                <td>
                    <div class="actions-group">
                        <button class="btn btn-sm btn-success" data-id="${agendamento.id}" data-action="detalhes" title="Ver Detalhes Completos">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-info" data-id="${agendamento.id}" data-action="remarcar" title="Remarcar Data/Hora">
                            <i class="fas fa-calendar-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" data-id="${agendamento.id}" data-action="status" title="Alterar Status">
                            <i class="fas fa-clipboard-check"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" data-id="${agendamento.id}" data-action="editar" title="Editar Produtos/Procedimentos">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" data-id="${agendamento.id}" data-action="excluir" title="Excluir Agendamento">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    mostrarTabela();
}

// Controles de exibição
function mostrarLoading() {
    document.getElementById('loadingContainer').style.display = 'block';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('emptyContainer').style.display = 'none';
    document.getElementById('paginationContainer').style.display = 'none';
}

function ocultarLoading() {
    document.getElementById('loadingContainer').style.display = 'none';
}

function mostrarTabela() {
    document.getElementById('tableContainer').style.display = 'block';
    document.getElementById('emptyContainer').style.display = 'none';
    document.getElementById('paginationContainer').style.display = 'flex';
}

function mostrarVazio() {
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('emptyContainer').style.display = 'block';
    document.getElementById('paginationContainer').style.display = 'none';
}

function mostrarErro(mensagem) {
    alert('❌ ' + mensagem);
    mostrarVazio();
}

// ===== FUNÇÕES DE PAGINAÇÃO =====

// Paginação
function atualizarPaginacao(pagination) {
    const container = document.getElementById('paginationContainer');
    paginaAtual = pagination.currentPage;
    totalPaginas = pagination.totalPages;
    
    if (totalPaginas <= 1) {
        container.style.display = 'none';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `<button ${!pagination.hasPrev ? 'disabled' : ''} onclick="buscarAgendamentos(${paginaAtual - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Páginas
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === paginaAtual || i === 1 || i === totalPaginas || (i >= paginaAtual - 1 && i <= paginaAtual + 1)) {
            html += `<button class="${i === paginaAtual ? 'active' : ''}" onclick="buscarAgendamentos(${i})">${i}</button>`;
        } else if (i === paginaAtual - 2 || i === paginaAtual + 2) {
            html += '<span>...</span>';
        }
    }
    
    // Botão próximo
    html += `<button ${!pagination.hasNext ? 'disabled' : ''} onclick="buscarAgendamentos(${paginaAtual + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    container.innerHTML = html;
}

// ===== FUNÇÕES DE DETALHES =====

// Ver detalhes completos do agendamento
function verDetalhesAgendamento(id) {
    fetch(`/sistema/agendamentos/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const agendamento = data.data;
                
                // Formatar data e hora
                const dataAgendamento = new Date(agendamento.data_agendamento);
                const dataFormatada = dataAgendamento.toLocaleDateString('pt-BR');
                const horaFormatada = dataAgendamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                // Formatar valores
                const valor = agendamento.valor ? `R$ ${parseFloat(agendamento.valor).toFixed(2).replace('.', ',')}` : 'Não informado';
                const desconto = agendamento.desconto ? `R$ ${parseFloat(agendamento.desconto).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
                const valorFinal = agendamento.valor_final ? `R$ ${parseFloat(agendamento.valor_final).toFixed(2).replace('.', ',')}` : 'Não informado';
                
                // Montar lista de itens
                let itensTexto = 'Nenhum item específico';
                if (agendamento.itens && agendamento.itens.length > 0) {
                    itensTexto = agendamento.itens.map(item => {
                        const valorItem = parseFloat(item.valor_unitario || 0).toFixed(2).replace('.', ',');
                        const descontoItem = parseFloat(item.desconto || 0).toFixed(2).replace('.', ',');
                        return `• ${item.produto.nome} (${item.quantidade}x) - R$ ${valorItem} cada${item.desconto > 0 ? ` - Desc: R$ ${descontoItem}` : ''}`;
                    }).join('\n');
                } else if (agendamento.produto?.nome) {
                    itensTexto = `• ${agendamento.produto.nome}`;
                }
                
                // Criar HTML detalhado para o modal
                const detalhesHtml = `
                    <div style="display: grid; gap: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">👤 Paciente</h4>
                                <p style="margin: 5px 0; font-weight: 600; color: #374151;">${agendamento.paciente?.nome || 'N/A'}</p>
                                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">📄 CPF: ${agendamento.paciente?.cpf || 'N/A'}</p>
                                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">📞 ${agendamento.paciente?.telefone || 'Não informado'}</p>
                            </div>
                            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">👨‍⚕️ Profissional</h4>
                                <p style="margin: 5px 0; font-weight: 600; color: #374151;">${agendamento.profissional?.nome || 'N/A'}</p>
                                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${agendamento.profissional?.especialidade || ''}</p>
                            </div>
                        </div>
                        
                        <div style="padding: 15px; background: #f0f9ff; border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">📅 Data e Hora</h4>
                            <p style="margin: 5px 0; font-weight: 600; color: #374151; font-size: 16px;">${dataFormatada} às ${horaFormatada}</p>
                        </div>
                        
                        <div style="padding: 15px; background: #fefce8; border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">🏥 Procedimentos/Produtos</h4>
                            <div style="white-space: pre-line; color: #374151; line-height: 1.6;">${itensTexto}</div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="padding: 15px; background: #f0fdf4; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">💰 Valores</h4>
                                <p style="margin: 5px 0; color: #374151;">Subtotal: <strong>${valor}</strong></p>
                                <p style="margin: 5px 0; color: #374151;">Desconto: <strong>${desconto}</strong></p>
                                <p style="margin: 5px 0; color: #374151; font-size: 16px;">Total: <strong style="color: #059669;">${valorFinal}</strong></p>
                            </div>
                            <div style="padding: 15px; background: #fef2f2; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">📊 Status</h4>
                                <p style="margin: 5px 0; font-weight: 600; color: #374151; text-transform: uppercase;">${agendamento.status}</p>
                            </div>
                        </div>
                        
                        <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">📝 Observações</h4>
                            <p style="margin: 5px 0; color: #374151; line-height: 1.6;">${agendamento.observacoes || 'Nenhuma observação'}</p>
                        </div>
                        
                        <div style="padding: 15px; background: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px;">📅 Informações do Sistema</h4>
                            <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Criado em: ${new Date(agendamento.criado_em).toLocaleString('pt-BR')}</p>
                            <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Atualizado em: ${new Date(agendamento.atualizado_em).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                `;
                
                // Preencher modal e exibir
                document.getElementById('conteudoDetalhes').innerHTML = detalhesHtml;
                document.getElementById('modalDetalhes').style.display = 'flex';
            } else {
                alert('❌ Erro ao carregar detalhes do agendamento');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('❌ Erro ao carregar detalhes');
        });
}

// Funções para controlar modal de detalhes
function fecharModalDetalhes() {
    document.getElementById('modalDetalhes').style.display = 'none';
}

// ===== FUNÇÕES DE REAGENDAMENTO =====

// Remarcar agendamento (apenas data e hora)
function remarcarAgendamento(id) {
    fetch(`/sistema/agendamentos/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const agendamento = data.data;
                agendamentoReagendandoId = id;
                
                // Obter data e hora atuais
                const dataAtual = new Date(agendamento.data_agendamento);
                const dataFormatada = dataAtual.toISOString().split('T')[0];
                const horaFormatada = dataAtual.toTimeString().slice(0, 5);
                
                // Preencher informações no modal
                const infoHtml = `
                    <div style="text-align: center;">
                        <h4 style="margin: 0 0 10px 0; color: #1e293b;">👤 ${agendamento.paciente?.nome || 'N/A'}</h4>
                        <p style="margin: 5px 0; color: #6b7280;">📅 Data atual: <strong>${dataAtual.toLocaleDateString('pt-BR')}</strong></p>
                        <p style="margin: 5px 0; color: #6b7280;">🕐 Hora atual: <strong>${dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></p>
                    </div>
                `;
                
                document.getElementById('infoReagendamento').innerHTML = infoHtml;
                
                // Preencher campos com valores atuais
                document.getElementById('novaDataReagendar').value = dataFormatada;
                document.getElementById('novaHoraReagendar').value = horaFormatada;
                
                // Exibir modal
                document.getElementById('modalReagendar').style.display = 'flex';
            } else {
                alert('❌ Erro ao carregar dados do agendamento');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('❌ Erro ao carregar agendamento');
        });
}

// Funções para controlar modal de reagendar
function fecharModalReagendar() {
    document.getElementById('modalReagendar').style.display = 'none';
    agendamentoReagendandoId = null;
}

// Confirmar reagendamento
function confirmarReagendamento(event) {
    event.preventDefault();
    
    if (!agendamentoReagendandoId) {
        alert('❌ Erro: ID do agendamento não encontrado');
        return;
    }
    
    const novaData = document.getElementById('novaDataReagendar').value;
    const novaHora = document.getElementById('novaHoraReagendar').value;
    
    if (!novaData || !novaHora) {
        alert('❌ Por favor, preencha data e hora');
        return;
    }
    
    const novaDataHora = `${novaData} ${novaHora}:00`;
    
    // Buscar dados do agendamento para enviar profissional_id
    fetch(`/sistema/agendamentos/${agendamentoReagendandoId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const agendamento = data.data;
                
                // Atualizar no backend
                fetch(`/sistema/agendamentos/${agendamentoReagendandoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data_agendamento: novaDataHora,
                        profissional_id: agendamento.profissional_id
                    })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        alert('✅ Agendamento reagendado com sucesso!');
                        fecharModalReagendar();
                        buscarAgendamentos();
                    } else {
                        alert('❌ ' + result.message);
                    }
                })
                .catch(error => {
                    console.error('Erro:', error);
                    alert('❌ Erro ao reagendar agendamento');
                });
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('❌ Erro ao carregar dados do agendamento');
        });
}

// ===== FUNÇÕES DE STATUS =====

// Alterar status do agendamento
function alterarStatusAgendamento(id) {
    fetch(`/sistema/agendamentos/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const agendamento = data.data;
                const statusAtual = agendamento.status;
                
                // Determinar novo status baseado no atual
                let novoStatus;
                let mensagem;
                
                if (statusAtual === 'agendado' || statusAtual === 'confirmado') {
                    novoStatus = 'concluido';
                    mensagem = `📋 MARCAR COMO ATENDIDO\n\nPaciente: ${agendamento.paciente?.nome}\nStatus atual: ${statusAtual.toUpperCase()}\n\n✅ Marcar como ATENDIDO?`;
                } else if (statusAtual === 'concluido') {
                    novoStatus = 'agendado';
                    mensagem = `📋 MARCAR COMO AGENDADO\n\nPaciente: ${agendamento.paciente?.nome}\nStatus atual: ${statusAtual.toUpperCase()}\n\n📅 Marcar como AGENDADO?`;
                } else {
                    alert(`❌ Não é possível alterar o status '${statusAtual}'.\n\nApenas agendamentos com status 'agendado', 'confirmado' ou 'concluido' podem ser alterados.`);
                    return;
                }
                
                const confirmacao = confirm(mensagem);
                
                if (!confirmacao) return;
                
                // Atualizar status no backend
                fetch(`/sistema/agendamentos/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: novoStatus })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        alert(`✅ Status alterado para: ${novoStatus.toUpperCase()}`);
                        buscarAgendamentos();
                    } else {
                        alert('❌ ' + result.message);
                    }
                })
                .catch(error => {
                    console.error('Erro:', error);
                    alert('❌ Erro ao alterar status');
                });
            } else {
                alert('❌ Erro ao carregar dados do agendamento');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('❌ Erro ao carregar agendamento');
        });
}

// ===== FUNÇÕES DE MODAL DE AGENDAMENTO =====

// Abrir modal
function abrirModalAgendamento() {
    document.getElementById('modalAgendamento').style.display = 'flex';
}

// Fechar modal
function fecharModal() {
    document.getElementById('modalAgendamento').style.display = 'none';
    document.getElementById('formAgendamento').reset();
    document.getElementById('infoPacienteDiv').style.display = 'none';
    document.getElementById('pacienteId').value = '';
    agendamentoEditando = null;
    itensAgendamento = [];
    contadorItens = 0;
    document.getElementById('modalTitle').textContent = 'Novo Agendamento';
    document.getElementById('tipoAgendamento').value = 'analise';
    document.getElementById('secaoItens').style.display = 'none';
    document.getElementById('resumoValores').style.display = 'none';
    document.getElementById('listaItens').innerHTML = '';
    
    // Reabilitar campos que podem ter sido desabilitados
    document.getElementById('buscaPaciente').disabled = false;
    document.getElementById('profissionalSelect').disabled = false;
    document.getElementById('dataAgendamento').disabled = false;
    document.getElementById('horarioAgendamento').disabled = false;
    
    // Limpar lista de pacientes se existir
    const listaPacientes = document.getElementById('listaPacientes');
    if (listaPacientes) {
        listaPacientes.remove();
    }
    
    // Remover aviso de edição se existir
    const avisoEdicao = document.getElementById('avisoEdicao');
    if (avisoEdicao) {
        avisoEdicao.remove();
    }
}

// Alterar tipo de agendamento
function alterarTipoAgendamento() {
    const tipo = document.getElementById('tipoAgendamento').value;
    const secaoItens = document.getElementById('secaoItens');
    const resumoValores = document.getElementById('resumoValores');
    
    if (tipo === 'procedimentos') {
        secaoItens.style.display = 'block';
        resumoValores.style.display = 'block';
        if (itensAgendamento.length === 0) {
            adicionarItem();
        }
    } else {
        secaoItens.style.display = 'none';
        resumoValores.style.display = 'none';
        itensAgendamento = [];
        document.getElementById('listaItens').innerHTML = '';
    }
    calcularTotais();
}

// ===== FUNÇÕES DE ITENS =====

// Adicionar item
function adicionarItem() {
    contadorItens++;
    const itemId = `item_${contadorItens}`;
    
    const itemHtml = `
        <div id="${itemId}" style="border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; margin-bottom: 10px; background: white;">
            <div style="display: grid; grid-template-columns: 2fr 80px 100px 100px 40px; gap: 10px; align-items: end;">
                <div>
                    <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 5px; font-size: 12px;">Produto/Procedimento</label>
                    <select onchange="atualizarPrecoItem('${itemId}')" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <option value="">Selecione...</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 5px; font-size: 12px;">Qtd</label>
                    <input type="number" value="1" min="1" onchange="calcularTotais()" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                </div>
                <div>
                    <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 5px; font-size: 12px;">Valor Un.</label>
                    <input type="number" step="0.01" min="0" onchange="calcularTotais()" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                </div>
                <div>
                    <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 5px; font-size: 12px;">Desconto</label>
                    <input type="number" step="0.01" min="0" value="0" onchange="calcularTotais()" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                </div>
                <div>
                    <button type="button" onclick="removerItem('${itemId}')" style="padding: 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Remover">
                        <i class="fas fa-trash" style="font-size: 10px;"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('listaItens').insertAdjacentHTML('beforeend', itemHtml);
    carregarProdutosNoItem(itemId);
    calcularTotais(); // Recalcular totais após adicionar item
}

// Remover item
function removerItem(itemId) {
    document.getElementById(itemId).remove();
    calcularTotais();
}

// Atualizar preço do item
function atualizarPrecoItem(itemId) {
    const item = document.getElementById(itemId);
    const select = item.querySelector('select');
    const inputs = item.querySelectorAll('input[type="number"]');
    const inputValor = inputs[1]; // Segundo input é o valor unitário
    
    const produtoId = select.value;
    console.log('Produto selecionado:', produtoId);
    console.log('Produtos disponíveis:', todosProdutos.length);
    
    if (produtoId) {
        const produto = todosProdutos.find(p => p.id == produtoId);
        console.log('Produto encontrado:', produto);
        
        if (produto && produto.preco) {
            const preco = parseFloat(produto.preco).toFixed(2);
            console.log('Preço a ser definido:', preco);
            inputValor.value = preco;
            calcularTotais();
        } else {
            console.log('Produto sem preço ou não encontrado');
            inputValor.value = '0.00';
        }
    } else {
        inputValor.value = '';
        calcularTotais();
    }
}

// Calcular totais
function calcularTotais() {
    let subtotal = 0;
    let descontoTotal = 0;
    
    const itens = document.querySelectorAll('#listaItens > div');
    console.log('Calculando totais para', itens.length, 'itens');
    
    itens.forEach((item, index) => {
        const inputs = item.querySelectorAll('input[type="number"]');
        const quantidade = parseFloat(inputs[0]?.value) || 0;
        const valorUnitario = parseFloat(inputs[1]?.value) || 0;
        const desconto = parseFloat(inputs[2]?.value) || 0;
        
        console.log(`Item ${index + 1}: Qtd=${quantidade}, Valor=${valorUnitario}, Desconto=${desconto}`);
        
        subtotal += quantidade * valorUnitario;
        descontoTotal += desconto;
    });
    
    const total = subtotal - descontoTotal;
    
    console.log(`Totais: Subtotal=${subtotal}, Desconto=${descontoTotal}, Total=${total}`);
    
    document.getElementById('subtotalAgendamento').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('descontoTotalAgendamento').textContent = `R$ ${descontoTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('totalAgendamento').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ===== FUNÇÕES DE SALVAMENTO =====

// Salvar agendamento
function salvarAgendamento(event) {
    event.preventDefault();
    
    const pacienteId = document.getElementById('pacienteId').value;
    const profissionalId = document.getElementById('profissionalSelect').value;
    const tipoAgendamento = document.getElementById('tipoAgendamento').value;
    const data = document.getElementById('dataAgendamento').value;
    const horario = document.getElementById('horarioAgendamento').value;
    const observacoes = document.getElementById('observacoesAgendamento').value;
    
    if (!pacienteId) {
        alert('❌ Selecione um paciente');
        return;
    }
    
    if (!profissionalId) {
        alert('❌ Selecione um profissional');
        return;
    }
    
    if (!data || !horario) {
        alert('❌ Data e horário são obrigatórios');
        return;
    }
    
    // Coletar itens se for agendamento com procedimentos
    let itens = [];
    let valorTotal = 0;
    let descontoTotal = 0;
    
    if (tipoAgendamento === 'procedimentos') {
        const divItens = document.querySelectorAll('#listaItens > div');
        
        if (divItens.length === 0) {
            alert('❌ Adicione pelo menos um procedimento ou produto');
            return;
        }
        
        divItens.forEach(item => {
            const select = item.querySelector('select');
            const inputs = item.querySelectorAll('input[type="number"]');
            
            if (!select || !inputs || inputs.length < 3) {
                console.log('Item inválido encontrado, pulando...');
                return;
            }
            
            const quantidade = parseInt(inputs[0]?.value) || 0;
            const valorUnitario = parseFloat(inputs[1]?.value) || 0;
            const desconto = parseFloat(inputs[2]?.value) || 0;
            
            console.log('Processando item:', { select: select.value, quantidade, valorUnitario, desconto });
            
            if (select.value && quantidade > 0) {
                itens.push({
                    produto_id: select.value,
                    quantidade: quantidade,
                    valor_unitario: valorUnitario,
                    desconto: desconto
                });
                
                valorTotal += quantidade * valorUnitario;
                descontoTotal += desconto;
            }
        });
        
        if (itens.length === 0) {
            alert('❌ Selecione pelo menos um produto/procedimento válido');
            return;
        }
    }
    
    const dataAgendamento = `${data} ${horario}:00`;
    
    const dados = {
        paciente_id: pacienteId,
        profissional_id: profissionalId,
        data_agendamento: dataAgendamento,
        observacoes: observacoes,
        valor: valorTotal > 0 ? valorTotal : null,
        desconto: descontoTotal,
        valor_final: valorTotal - descontoTotal,
        itens: itens
    };
    
    const url = agendamentoEditando ? `/sistema/agendamentos/${agendamentoEditando}` : '/sistema/agendamentos';
    const method = agendamentoEditando ? 'PUT' : 'POST';
    const successMessage = agendamentoEditando ? 'Agendamento atualizado!' : 'Agendamento criado!';
    
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ ' + successMessage);
            fecharModal();
            buscarAgendamentos();
        } else {
            alert('❌ ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('❌ Erro ao salvar agendamento');
    });
}

// ===== FUNÇÕES DE CARREGAMENTO =====

// Carregar profissionais
function carregarProfissionais() {
    fetch('/sistema/profissionais')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('profissionalSelect');
                select.innerHTML = '<option value="">Selecione um profissional</option>';
                data.data.forEach(prof => {
                    select.innerHTML += `<option value="${prof.id}">${prof.nome} - ${prof.especialidade || 'Geral'}</option>`;
                });
            }
        })
        .catch(error => console.error('Erro ao carregar profissionais:', error));
}

// Carregar todos os produtos
function carregarTodosProdutos() {
    console.log('Carregando produtos...');
    fetch('/sistema/produtos/todos')
        .then(response => response.json())
        .then(data => {
            console.log('Resposta da API:', data);
            if (data.success && data.data.length > 0) {
                todosProdutos = data.data;
                console.log('Produtos carregados:', todosProdutos.length);
            } else {
                console.log('Nenhum produto encontrado');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar produtos:', error);
        });
}

// Carregar produtos em um item específico
function carregarProdutosNoItem(itemId) {
    const item = document.getElementById(itemId);
    const select = item.querySelector('select');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    
    todosProdutos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} - ${produto.categoria}`;
        option.setAttribute('data-preco', produto.preco);
        select.appendChild(option);
    });
}

// ===== FUNÇÕES DE BUSCA DE PACIENTES =====

// Buscar pacientes
function buscarPacientes() {
    const termo = document.getElementById('buscaPaciente').value.trim();
    
    if (!termo) {
        alert('❌ Digite um nome ou CPF para buscar');
        return;
    }
    
    fetch(`/sistema/pacientes/buscar?busca=${encodeURIComponent(termo)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                if (data.data.length === 1) {
                    // Apenas um paciente encontrado
                    selecionarPaciente(data.data[0]);
                } else {
                    // Múltiplos pacientes encontrados
                    mostrarListaPacientes(data.data);
                }
            } else {
                alert('❌ Nenhum paciente encontrado');
                document.getElementById('infoPacienteDiv').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('❌ Erro ao buscar paciente');
        });
}

// Selecionar paciente específico
function selecionarPaciente(paciente) {
    document.getElementById('pacienteId').value = paciente.id;
    document.getElementById('infoPaciente').innerHTML = `
        <strong>${paciente.nome}</strong><br>
        CPF: ${paciente.cpf}<br>
        Telefone: ${paciente.telefone || 'Não informado'}
    `;
    document.getElementById('infoPacienteDiv').style.display = 'block';
    
    // Esconder lista de seleção se estiver visível
    const listaPacientes = document.getElementById('listaPacientes');
    if (listaPacientes) {
        listaPacientes.style.display = 'none';
    }
}

// Mostrar lista de pacientes para seleção
function mostrarListaPacientes(pacientes) {
    let listaHtml = '<div id="listaPacientes" style="border: 1px solid #d1d5db; border-radius: 6px; background: white; max-height: 200px; overflow-y: auto; margin-top: 5px;">';
    
    pacientes.forEach((paciente, index) => {
        listaHtml += `
            <div onclick="selecionarPaciente({id: ${paciente.id}, nome: '${paciente.nome}', cpf: '${paciente.cpf}', telefone: '${paciente.telefone || ''}'})" 
                 style="padding: 10px; border-bottom: 1px solid #e5e7eb; cursor: pointer; hover:background-color: #f3f4f6;" 
                 onmouseover="this.style.backgroundColor='#f3f4f6'" 
                 onmouseout="this.style.backgroundColor='white'">
                <strong>${paciente.nome}</strong><br>
                <small>CPF: ${paciente.cpf} | Tel: ${paciente.telefone || 'Não informado'}</small>
            </div>
        `;
    });
    
    listaHtml += '</div>';
    
    // Remover lista anterior se existir
    const listaExistente = document.getElementById('listaPacientes');
    if (listaExistente) {
        listaExistente.remove();
    }
    
    // Adicionar nova lista após o campo de busca
    const campoBusca = document.getElementById('buscaPaciente').parentElement;
    campoBusca.insertAdjacentHTML('afterend', listaHtml);
    
    // Esconder info do paciente
    document.getElementById('infoPacienteDiv').style.display = 'none';
}

// ===== FUNÇÕES DE EDIÇÃO =====

// Editar produtos/procedimentos do agendamento
function editarProdutosAgendamento(id) {
    fetch(`/sistema/agendamentos/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const agendamento = data.data;
                agendamentoEditando = id;
                
                // Alterar título do modal
                document.getElementById('modalTitle').textContent = 'Editar Apenas Produtos/Procedimentos';
                
                // Adicionar aviso no modal
                const avisoHtml = '<div id="avisoEdicao" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px; margin-bottom: 15px; color: #92400e;"><strong>⚠️ MODO DE EDIÇÃO RESTRITA:</strong><br>Apenas produtos e procedimentos podem ser editados. Para alterar data/hora use o botão de remarcar.</div>';
                const modalBody = document.querySelector('#modalAgendamento form > div');
                modalBody.insertAdjacentHTML('afterbegin', avisoHtml);
                
                // Preencher apenas dados básicos (não editáveis)
                document.getElementById('pacienteId').value = agendamento.paciente_id;
                document.getElementById('buscaPaciente').value = agendamento.paciente?.nome || '';
                document.getElementById('buscaPaciente').disabled = true;
                document.getElementById('infoPaciente').innerHTML = `
                    <strong>${agendamento.paciente?.nome || 'N/A'}</strong><br>
                    CPF: ${agendamento.paciente?.cpf || 'N/A'}<br>
                    Telefone: ${agendamento.paciente?.telefone || 'Não informado'}
                `;
                document.getElementById('infoPacienteDiv').style.display = 'block';
                
                document.getElementById('profissionalSelect').value = agendamento.profissional_id;
                document.getElementById('profissionalSelect').disabled = true;
                
                const dataAgendamento = new Date(agendamento.data_agendamento);
                document.getElementById('dataAgendamento').value = dataAgendamento.toISOString().split('T')[0];
                document.getElementById('dataAgendamento').disabled = true;
                document.getElementById('horarioAgendamento').value = dataAgendamento.toTimeString().slice(0, 5);
                document.getElementById('horarioAgendamento').disabled = true;
                
                // Configurar tipo de agendamento e itens
                if (agendamento.itens && agendamento.itens.length > 0) {
                    document.getElementById('tipoAgendamento').value = 'procedimentos';
                    alterarTipoAgendamento();
                    
                    // Limpar itens existentes
                    document.getElementById('listaItens').innerHTML = '';
                    
                    // Carregar itens do agendamento
                    agendamento.itens.forEach(item => {
                        adicionarItem();
                        const ultimoItem = document.querySelector('#listaItens > div:last-child');
                        const select = ultimoItem.querySelector('select');
                        const inputs = ultimoItem.querySelectorAll('input[type="number"]');
                        
                        // Aguardar produtos carregarem antes de definir valores
                        setTimeout(() => {
                            select.value = item.produto_id;
                            inputs[0].value = item.quantidade;
                            inputs[1].value = parseFloat(item.valor_unitario).toFixed(2);
                            inputs[2].value = parseFloat(item.desconto).toFixed(2);
                            calcularTotais();
                        }, 100);
                    });
                } else {
                    document.getElementById('tipoAgendamento').value = 'analise';
                    alterarTipoAgendamento();
                }
                document.getElementById('observacoesAgendamento').value = agendamento.observacoes || '';
                
                abrirModalAgendamento();
            } else {
                alert('❌ Erro ao carregar dados do agendamento');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('❌ Erro ao carregar agendamento');
        });
}

// ===== FUNÇÕES DE EXCLUSÃO =====

// Excluir agendamento
function excluirAgendamento(id) {
    // Confirmação única e clara
    const confirmacao = confirm('🗑️ EXCLUIR AGENDAMENTO\n\n⚠️ Esta ação não pode ser desfeita!\n\nTem certeza que deseja excluir este agendamento?\n\n✅ OK = Excluir\n❌ Cancelar = Manter');
    
    if (!confirmacao) {
        console.log('Exclusão cancelada pelo usuário');
        return; // Usuário cancelou
    }
    
    console.log('Excluindo agendamento ID:', id);
    
    fetch(`/sistema/agendamentos/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ Agendamento excluído com sucesso!');
            buscarAgendamentos();
        } else {
            alert('❌ ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('❌ Erro ao excluir agendamento');
    });
}