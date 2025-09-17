/**
 * Gerenciamento da aba Evolução - Agendamentos e Pagamentos
 */

const EvolucaoManager = {
    /**
     * Carrega a lista de agendamentos/evolução
     */
    load: function(filtros = {}) {
        if (!currentPatientId) return;
        
        let url = Utils.buildUrl(CONFIG.ENDPOINTS.EVOLUCAO + '/' + currentPatientId);
        
        if (filtros.status && filtros.status !== 'todos') {
            url += `?status=${filtros.status}`;
        }
        
        Utils.request(url)
            .then(data => {
                if (data.success) {
                    this.render(data.data);
                } else {
                    console.error('Erro ao carregar evolução:', data.message);
                    document.getElementById('evolucaoList').innerHTML = '<div class="empty-state"><p>Erro ao carregar dados.</p></div>';
                }
            })
            .catch(error => {
                console.error('Erro ao carregar evolução:', error);
                document.getElementById('evolucaoList').innerHTML = '<div class="empty-state"><p>Erro ao carregar dados.</p></div>';
            });
    },

    /**
     * Renderiza a tabela de evolução
     */
    render: function(agendamentos) {
        const container = document.getElementById('evolucaoList');
        container.innerHTML = '';
        
        if (agendamentos.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Nenhum procedimento encontrado.</p></div>';
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'evolucao-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Data/Hora</th>
                    <th>Procedimento</th>
                    <th>Profissional</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Pagamento</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${agendamentos.map(agendamento => this.renderRow(agendamento)).join('')}
            </tbody>
        `;
        
        container.appendChild(table);
    },

    /**
     * Renderiza uma linha da tabela
     */
    renderRow: function(agendamento) {
        const statusClass = this.getStatusClass(agendamento.status);
        const statusText = this.getStatusText(agendamento.status);
        const isPago = agendamento.pagamentos && agendamento.pagamentos.some(p => p.status === 'pago');
        const valorFormatado = Utils.formatCurrency(agendamento.valor_total || agendamento.valor_final || agendamento.valor || 0);
        const dataAgendamento = new Date(agendamento.data_agendamento);
        
        return `
            <tr>
                <td>
                    <div class="data-hora">
                        <div class="data">${Utils.formatDate(agendamento.data_agendamento)}</div>
                        <div class="hora">${agendamento.horario || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div class="procedimento-info">
                        <div class="nome">${agendamento.produto?.nome || 'Procedimento'}</div>
                        ${agendamento.observacoes ? `<div class="observacoes">${agendamento.observacoes}</div>` : ''}
                    </div>
                </td>
                <td>${agendamento.profissional?.nome || agendamento.Usuario?.nome || 'N/A'}</td>
                <td class="valor">${valorFormatado}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="pagamento">
                    ${isPago ? 
                        '<span class="pagamento-pago"><i class="fas fa-check-circle"></i> Pago</span>' : 
                        '<span class="pagamento-pendente"><i class="fas fa-clock"></i> Pendente</span>'
                    }
                </td>
                <td class="acoes">
                    <button class="btn-small btn-primary" onclick="EvolucaoManager.viewDetails(${agendamento.id})" title="Ver Atendimento">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${this.getActionButtons(agendamento, isPago)}
                </td>
            </tr>
        `;
    },

    /**
     * Retorna os botões de ação baseado no status
     */
    getActionButtons: function(agendamento, isPago) {
        let buttons = '';
        
        // Botão de concluir para agendamentos não concluídos
        if (['agendado', 'confirmado', 'em_andamento'].includes(agendamento.status)) {
            buttons += `
                <button class="btn-small btn-warning" onclick="EvolucaoManager.conclude(${agendamento.id})" title="Concluir Atendimento">
                    <i class="fas fa-check-circle"></i>
                </button>
            `;
        }
        
        // Botão de confirmar pagamento para agendamentos concluídos não pagos
        if (agendamento.status === 'concluido' && !isPago) {
            buttons += `
                <button class="btn-small btn-success" onclick="EvolucaoManager.confirmPayment(${agendamento.id})" title="Confirmar Pagamento">
                    <i class="fas fa-dollar-sign"></i>
                </button>
            `;
        }
        
        return buttons;
    },

    /**
     * Filtra a evolução por status
     */
    filter: function() {
        const status = document.getElementById('statusFiltro').value;
        this.load({ status });
    },

    /**
     * Conclui um atendimento
     */
    conclude: function(agendamentoId) {
        if (!Utils.confirm('Concluir este atendimento?')) return;
        
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.STATUS, { id: agendamentoId });
        
        Utils.request(url, {
            method: 'PUT',
            body: JSON.stringify({ status: 'concluido' })
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Atendimento concluído com sucesso!');
                // Atualizar apenas a linha específica
                this.updateAgendamentoRow(agendamentoId, { status: 'concluido' });
            } else {
                Utils.notify('Erro ao concluir atendimento: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            Utils.notify('Erro ao concluir atendimento');
        });
    },

    /**
     * Confirma o pagamento
     */
    confirmPayment: function(agendamentoId) {
        if (!Utils.confirm('Confirmar o pagamento deste procedimento?')) return;
        
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.PAGAMENTO, { id: agendamentoId });
        
        Utils.request(url, {
            method: 'POST',
            body: JSON.stringify({ metodo_pagamento: 'dinheiro' })
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Pagamento confirmado com sucesso!');
                // Atualizar apenas a linha específica
                this.updateAgendamentoRow(agendamentoId, { pagamento_confirmado: true });
            } else {
                Utils.notify('Erro ao confirmar pagamento: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            Utils.notify('Erro ao confirmar pagamento');
        });
    },

    /**
     * Exibe detalhes do atendimento
     */
    viewDetails: function(agendamentoId) {
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.AGENDAMENTOS + '/' + agendamentoId);
        
        Utils.request(url)
            .then(data => {
                if (data.success) {
                    this.showDetailsModal(data.data);
                } else {
                    Utils.notify('Erro ao carregar detalhes do agendamento');
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                Utils.notify('Erro ao carregar detalhes');
            });
    },

    /**
     * Exibe modal com detalhes do atendimento
     */
    showDetailsModal: function(agendamento) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;';
        
        const isPago = agendamento.pagamentos && agendamento.pagamentos.some(p => p.status === 'pago');
        const valorTotal = Utils.formatCurrency(agendamento.valor_total || agendamento.valor_final || agendamento.valor || 0);
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #1e293b;">Detalhes do Atendimento</h3>
                    <button onclick="EvolucaoManager.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #374151;">Informações Gerais</h4>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 6px;">
                            <p><strong>Paciente:</strong> ${agendamento.paciente?.nome || 'N/A'}</p>
                            <p><strong>Profissional:</strong> ${agendamento.profissional?.nome || agendamento.Usuario?.nome || 'N/A'}</p>
                            <p><strong>Data:</strong> ${Utils.formatDate(agendamento.data_agendamento)}</p>
                            <p><strong>Horário:</strong> ${agendamento.horario || 'N/A'}</p>
                            <p><strong>Status:</strong> <span class="status-badge ${this.getStatusClass(agendamento.status)}">${this.getStatusText(agendamento.status)}</span></p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #374151;">Procedimentos</h4>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 6px;">
                            ${agendamento.itens && agendamento.itens.length > 0 ? 
                                agendamento.itens.map(item => `
                                    <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0; margin-bottom: 10px;">
                                        <p><strong>${item.produto?.nome || 'Procedimento'}</strong></p>
                                        <p>Quantidade: ${item.quantidade || 1}</p>
                                        <p>Valor unitário: ${Utils.formatCurrency(item.valor_unitario || 0)}</p>
                                        <p>Valor total: ${Utils.formatCurrency(item.valor_total || 0)}</p>
                                    </div>
                                `).join('') : 
                                `<p><strong>${agendamento.produto?.nome || 'Procedimento'}</strong></p>
                                 <p>Valor: ${valorTotal}</p>`
                            }
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #374151;">Pagamento</h4>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 6px;">
                            <p><strong>Valor Total:</strong> ${valorTotal}</p>
                            <p><strong>Status:</strong> ${isPago ? 
                                '<span style="color: #28a745; font-weight: 600;"><i class="fas fa-check-circle"></i> Pago</span>' : 
                                '<span style="color: #ffc107; font-weight: 600;"><i class="fas fa-clock"></i> Pendente</span>'
                            }</p>
                            ${agendamento.observacoes ? `<p><strong>Observações:</strong> ${agendamento.observacoes}</p>` : ''}
                        </div>
                    </div>
                    
                    ${agendamento.status === 'concluido' && !isPago ? `
                        <div style="text-align: center; margin-top: 20px;">
                            <button onclick="EvolucaoManager.confirmPaymentFromModal(${agendamento.id})" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-check"></i> Confirmar Pagamento
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentModal = modal;
    },

    /**
     * Fecha o modal
     */
    closeModal: function() {
        if (this.currentModal) {
            document.body.removeChild(this.currentModal);
            this.currentModal = null;
        }
    },

    /**
     * Confirma pagamento a partir do modal
     */
    confirmPaymentFromModal: function(agendamentoId) {
        this.confirmPayment(agendamentoId);
        this.closeModal();
    },

    /**
     * Atualiza uma linha específica da tabela
     */
    updateAgendamentoRow: function(agendamentoId, updates) {
        const table = document.querySelector('.evolucao-table tbody');
        if (!table) return;
        
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const actionButtons = row.querySelector('.acoes');
            if (actionButtons) {
                const buttons = actionButtons.querySelectorAll('button');
                buttons.forEach(button => {
                    const onclick = button.getAttribute('onclick');
                    if (onclick && onclick.includes(agendamentoId)) {
                        // Esta é a linha do agendamento
                        
                        // Atualizar status se fornecido
                        if (updates.status) {
                            const statusCell = row.querySelector('.status-badge');
                            if (statusCell) {
                                statusCell.textContent = this.getStatusText(updates.status);
                                statusCell.className = `status-badge ${this.getStatusClass(updates.status)}`;
                            }
                            
                            // Atualizar botões de ação
                            const isPago = updates.pagamento_confirmado || row.querySelector('.pagamento-pago');
                            const mockAgendamento = { id: agendamentoId, status: updates.status };
                            actionButtons.innerHTML = `
                                <button class="btn-small btn-primary" onclick="EvolucaoManager.viewDetails(${agendamentoId})" title="Ver Atendimento">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${this.getActionButtons(mockAgendamento, isPago)}
                            `;
                        }
                        
                        // Atualizar status de pagamento se confirmado
                        if (updates.pagamento_confirmado) {
                            const pagamentoCell = row.querySelector('.pagamento');
                            if (pagamentoCell) {
                                pagamentoCell.innerHTML = '<span class="pagamento-pago"><i class="fas fa-check-circle"></i> Pago</span>';
                            }
                            
                            // Remover botão de confirmar pagamento
                            const confirmButton = actionButtons.querySelector('button[onclick*="confirmPayment"]');
                            if (confirmButton) {
                                confirmButton.remove();
                            }
                        }
                    }
                });
            }
        });
    },

    /**
     * Retorna a classe CSS do status
     */
    getStatusClass: function(status) {
        return CONFIG.STATUS_COLORS[status] || 'status-default';
    },

    /**
     * Retorna o texto do status
     */
    getStatusText: function(status) {
        return CONFIG.STATUS_TEXTS[status] || status;
    }
};

// Funções globais para compatibilidade
function filtrarEvolucao() {
    EvolucaoManager.filter();
}

function carregarEvolucao() {
    EvolucaoManager.load();
}

function concluirAtendimento(id) {
    EvolucaoManager.conclude(id);
}

function confirmarPagamento(id) {
    EvolucaoManager.confirmPayment(id);
}

function verAtendimento(id) {
    EvolucaoManager.viewDetails(id);
}

function fecharModalDetalhes() {
    EvolucaoManager.closeModal();
}

function confirmarPagamentoModal(id) {
    EvolucaoManager.confirmPaymentFromModal(id);
}