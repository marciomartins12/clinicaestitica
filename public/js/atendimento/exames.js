/**
 * Gerenciamento da aba Exames
 */

const ExameManager = {
    /**
     * Carrega a lista de exames
     */
    load: function() {
        if (!currentPatientId) return;
        
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.EXAMES + '/' + currentPatientId);
        
        Utils.request(url)
            .then(data => {
                if (data.success) {
                    this.renderList(data.data);
                }
            })
            .catch(error => {
                console.error('Erro ao carregar exames:', error);
            });
    },

    /**
     * Renderiza a lista de exames
     */
    renderList: function(exames) {
        const solicitados = document.getElementById('examesSolicitados');
        const andamento = document.getElementById('examesAndamento');
        const concluidos = document.getElementById('examesConcluidos');
        
        if (!solicitados || !andamento || !concluidos) return;
        
        // Limpar containers
        solicitados.innerHTML = '';
        andamento.innerHTML = '';
        concluidos.innerHTML = '';
        
        if (exames.length === 0) {
            solicitados.innerHTML = '<div class="empty-exames"><i class="fas fa-clock"></i><p>Nenhum exame solicitado</p></div>';
            andamento.innerHTML = '<div class="empty-exames"><i class="fas fa-play-circle"></i><p>Nenhum exame em andamento</p></div>';
            concluidos.innerHTML = '<div class="empty-exames"><i class="fas fa-check-circle"></i><p>Nenhum exame concluído</p></div>';
            return;
        }
        
        // Separar exames por status
        const examesSolicitados = exames.filter(e => e.status === 'solicitado');
        const examesAndamento = exames.filter(e => e.status === 'em_andamento');
        const examesConcluidos = exames.filter(e => e.status === 'concluido');
        
        // Renderizar cada categoria
        this.renderExamesByStatus(examesSolicitados, solicitados, 'solicitado');
        this.renderExamesByStatus(examesAndamento, andamento, 'em_andamento');
        this.renderExamesByStatus(examesConcluidos, concluidos, 'concluido');
    },

    /**
     * Renderiza exames por status específico
     */
    renderExamesByStatus: function(exames, container, status) {
        if (exames.length === 0) {
            const emptyMessages = {
                'solicitado': '<div class="empty-exames"><i class="fas fa-clock"></i><p>Nenhum exame solicitado</p></div>',
                'em_andamento': '<div class="empty-exames"><i class="fas fa-play-circle"></i><p>Nenhum exame em andamento</p></div>',
                'concluido': '<div class="empty-exames"><i class="fas fa-check-circle"></i><p>Nenhum exame concluído</p></div>'
            };
            container.innerHTML = emptyMessages[status] || '<div class="empty-exames"><p>Nenhum exame</p></div>';
            return;
        }
        
        exames.forEach(exame => {
            const exameElement = this.createExameElement(exame);
            container.appendChild(exameElement);
        });
    },

    /**
     * Cria elemento HTML para um exame
     */
    createExameElement: function(exame) {
        const div = document.createElement('div');
        div.className = `exame-card ${exame.status}`;
        div.setAttribute('data-exame-id', exame.id);
        
        let resultadosHtml = '';
        if (exame.resultados) {
            if (Array.isArray(exame.resultados) && exame.resultados.length > 0) {
                resultadosHtml = '<div class="exame-resultados">';
                exame.resultados.forEach(resultado => {
                    resultadosHtml += `<p><strong>${resultado.chave}:</strong> ${resultado.valor}</p>`;
                });
                resultadosHtml += '</div>';
            } else if (typeof exame.resultados === 'string') {
                resultadosHtml = `<div class="exame-resultados"><p><strong>Resultados:</strong> ${exame.resultados}</p></div>`;
            }
        }
        
        div.innerHTML = `
            <div class="exame-header">
                <h5 class="exame-title">${exame.tipo_exame}</h5>
                <span class="exame-status ${exame.status}">${this.getStatusText(exame.status)}</span>
            </div>
            <div class="exame-info">
                <p><i class="fas fa-calendar"></i> <strong>Data:</strong> ${Utils.formatDate(exame.data_exame)}</p>
                ${exame.laboratorio ? `<p><i class="fas fa-building"></i> <strong>Laboratório:</strong> ${exame.laboratorio}</p>` : ''}
                ${exame.medico_solicitante ? `<p><i class="fas fa-user-md"></i> <strong>Médico:</strong> ${exame.medico_solicitante}</p>` : ''}
                ${exame.observacoes ? `<p><i class="fas fa-comment"></i> <strong>Observações:</strong> ${exame.observacoes}</p>` : ''}
            </div>
            ${resultadosHtml}
            <div class="exame-actions">
                ${this.getActionButtons(exame)}
            </div>
        `;
        return div;
    },

    /**
     * Retorna botões de ação para o exame
     */
    getActionButtons: function(exame) {
        let actionsHtml = '';
        
        if (exame.status === 'solicitado') {
            actionsHtml = `
                <button class="btn-small btn-resultado" onclick="ExameManager.updateStatus(${exame.id}, 'em_andamento')">
                    <i class="fas fa-play"></i> Iniciar
                </button>
                <button class="btn-small btn-danger" onclick="ExameManager.delete(${exame.id})">
                    <i class="fas fa-trash"></i> Apagar
                </button>
            `;
        } else if (exame.status === 'em_andamento') {
            actionsHtml = `
                <button class="btn-small btn-concluir" onclick="ExameManager.addResults(${exame.id})">
                    <i class="fas fa-plus"></i> Adicionar Resultados
                </button>
                <button class="btn-small btn-danger" onclick="ExameManager.delete(${exame.id})">
                    <i class="fas fa-trash"></i> Apagar
                </button>
            `;
        } else if (exame.status === 'concluido') {
            actionsHtml = `
                <button class="btn-small btn-secondary" onclick="ExameManager.viewResults(${exame.id})">
                    <i class="fas fa-eye"></i> Visualizar
                </button>
                <button class="btn-small btn-resultado" onclick="ExameManager.addResults(${exame.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-small btn-danger" onclick="ExameManager.delete(${exame.id})">
                    <i class="fas fa-trash"></i> Apagar
                </button>
            `;
        }
        
        return actionsHtml;
    },

    /**
     * Salva um novo exame
     */
    save: function() {
        if (!currentPatientId) {
            Utils.notify('ID do paciente não encontrado');
            return;
        }

        const exame = {
            paciente_id: currentPatientId,
            tipo_exame: document.getElementById('tipoExame').value,
            data_exame: document.getElementById('dataExame').value,
            laboratorio: document.getElementById('laboratorio').value,
            medico_solicitante: document.getElementById('medicoSolicitante').value,
            observacoes: document.getElementById('observacoesExame').value,
            status: 'solicitado'
        };

        if (!exame.tipo_exame || !exame.data_exame) {
            Utils.notify('Preencha os campos obrigatórios');
            return;
        }

        const url = Utils.buildUrl(CONFIG.ENDPOINTS.EXAMES);
        
        Utils.request(url, {
            method: 'POST',
            body: JSON.stringify(exame)
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Exame salvo com sucesso!');
                this.clearForm();
                // Adicionar o novo exame à lista sem recarregar
                this.addExameToList({
                    id: data.data.id,
                    tipo_exame: exame.tipo_exame,
                    data_exame: exame.data_exame,
                    laboratorio: exame.laboratorio,
                    medico_solicitante: exame.medico_solicitante,
                    observacoes: exame.observacoes,
                    status: 'solicitado',
                    criado_em: new Date().toISOString()
                });
            } else {
                Utils.notify('Erro ao salvar exame: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar exame:', error);
            Utils.notify('Erro ao salvar exame');
        });
    },

    /**
     * Atualiza o status de um exame
     */
    updateStatus: function(exameId, status) {
        const url = Utils.buildUrl('/atendimento/exame/status');
        
        Utils.request(url, {
            method: 'PUT',
            body: JSON.stringify({ exame_id: exameId, status: status })
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Status atualizado com sucesso!');
                // Atualizar apenas o item específico ao invés de recarregar toda a lista
                this.updateExameItem(exameId, { status: status });
            } else {
                Utils.notify('Erro ao atualizar status: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar status:', error);
            Utils.notify('Erro ao atualizar status');
        });
    },

    /**
     * Adiciona resultados ao exame
     */
    addResults: function(exameId) {
        // Buscar dados do exame primeiro
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.EXAMES + '/' + currentPatientId);
        
        Utils.request(url)
            .then(data => {
                if (data.success) {
                    const exame = data.data.find(e => e.id == exameId);
                    if (exame) {
                        this.showResultsModal(exame);
                    } else {
                        Utils.notify('Exame não encontrado');
                    }
                } else {
                    Utils.notify('Erro ao carregar dados do exame');
                }
            })
            .catch(error => {
                console.error('Erro ao carregar exame:', error);
                Utils.notify('Erro ao carregar dados do exame');
            });
    },

    /**
     * Exibe modal para adicionar/editar resultados
     */
    showResultsModal: function(exame) {
        // Usar o modal existente no HTML
        const modal = document.getElementById('resultadosExameModal');
        if (!modal) {
            Utils.notify('Modal de resultados não encontrado');
            return;
        }
        
        // Configurar dados do exame
        document.getElementById('exameNomeResultado').textContent = exame.tipo_exame;
        document.getElementById('exameDataResultado').textContent = `Data: ${Utils.formatDate(exame.data_exame)}`;
        
        // Limpar campos
        document.getElementById('observacoesFinais').value = exame.observacoes || '';
        
        // Configurar variáveis globais
        window.currentExameId = exame.id;
        window.resultadosTemporarios = [];
        
        // Carregar resultados existentes se houver
        if (exame.resultados) {
            if (Array.isArray(exame.resultados)) {
                window.resultadosTemporarios = [...exame.resultados];
            } else if (typeof exame.resultados === 'string') {
                // Se for string, tentar converter ou criar um resultado genérico
                window.resultadosTemporarios = [{ chave: 'Resultado', valor: exame.resultados }];
            }
        }
        
        // Atualizar lista de resultados
        this.atualizarListaResultados();
        
        // Exibir modal
        modal.style.display = 'flex';
        
        // Focar no primeiro campo
        setTimeout(() => {
            document.getElementById('novaChave').focus();
        }, 100);
    },

    /**
     * Adiciona um resultado chave-valor
     */
    adicionarResultado: function() {
        const chave = document.getElementById('novaChave').value.trim();
        const valor = document.getElementById('novoValor').value.trim();
        
        if (!chave || !valor) {
            Utils.notify('Por favor, preencha tanto a chave quanto o valor.');
            return;
        }
        
        // Verificar se a chave já existe
        const existeChave = window.resultadosTemporarios.find(r => r.chave.toLowerCase() === chave.toLowerCase());
        if (existeChave) {
            if (Utils.confirm(`A chave "${chave}" já existe. Deseja substituir o valor?`)) {
                existeChave.valor = valor;
            } else {
                return;
            }
        } else {
            window.resultadosTemporarios.push({ chave, valor });
        }
        
        // Limpar campos
        document.getElementById('novaChave').value = '';
        document.getElementById('novoValor').value = '';
        
        this.atualizarListaResultados();
    },

    /**
     * Atualiza a lista de resultados no modal
     */
    atualizarListaResultados: function() {
        const lista = document.getElementById('resultadosList');
        if (!lista) return;
        
        if (!window.resultadosTemporarios || window.resultadosTemporarios.length === 0) {
            lista.innerHTML = '<p class="empty-resultados">Nenhum resultado adicionado ainda.</p>';
            return;
        }
        
        lista.innerHTML = window.resultadosTemporarios.map((resultado, index) => {
            return `
                <div class="resultado-item">
                    <div class="resultado-content">
                        <div class="resultado-chave">${resultado.chave}</div>
                        <div class="resultado-valor">${resultado.valor}</div>
                    </div>
                    <button class="resultado-remove" onclick="ExameManager.removerResultado(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    },

    /**
     * Remove um resultado da lista
     */
    removerResultado: function(index) {
        if (window.resultadosTemporarios) {
            window.resultadosTemporarios.splice(index, 1);
            this.atualizarListaResultados();
        }
    },

    /**
     * Salva os resultados do exame
     */
    saveResults: function() {
        if (!window.resultadosTemporarios || window.resultadosTemporarios.length === 0) {
            Utils.notify('Adicione pelo menos um resultado antes de salvar.');
            return;
        }
        
        const dadosExame = {
            exame_id: window.currentExameId,
            resultados: window.resultadosTemporarios,
            observacoes: document.getElementById('observacoesFinais').value,
            status: 'concluido'
        };
        
        const url = Utils.buildUrl('/atendimento/exame/resultado');
        
        Utils.request(url, {
            method: 'PUT',
            body: JSON.stringify(dadosExame)
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Resultados salvos com sucesso!');
                this.closeResultsModal();
                // Atualizar apenas o item específico
                this.updateExameItem(window.currentExameId, { 
                    resultados: window.resultadosTemporarios, 
                    observacoes: dadosExame.observacoes,
                    status: 'concluido' 
                });
            } else {
                Utils.notify('Erro ao salvar resultados: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar resultados:', error);
            Utils.notify('Erro ao salvar resultados');
        });
    },

    /**
     * Fecha o modal de resultados
     */
    closeResultsModal: function() {
        const modal = document.getElementById('resultadosExameModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Limpar variáveis globais
        window.currentExameId = null;
        window.resultadosTemporarios = [];
        
        // Limpar campos
        document.getElementById('novaChave').value = '';
        document.getElementById('novoValor').value = '';
        document.getElementById('observacoesFinais').value = '';
        
        // Limpar lista
        const lista = document.getElementById('resultadosList');
        if (lista) {
            lista.innerHTML = '<p class="empty-resultados">Nenhum resultado adicionado ainda.</p>';
        }
    },

    /**
     * Visualiza resultados do exame
     */
    viewResults: function(exameId) {
        // Buscar dados do exame
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.EXAMES + '/' + currentPatientId);
        
        Utils.request(url)
            .then(data => {
                if (data.success) {
                    const exame = data.data.find(e => e.id == exameId);
                    if (exame && exame.resultados) {
                        let resultadosText = '';
                        if (Array.isArray(exame.resultados)) {
                            resultadosText = exame.resultados.map(r => `${r.chave}: ${r.valor}`).join('\n');
                        } else {
                            resultadosText = exame.resultados;
                        }
                        alert(`Resultados do exame ${exame.tipo_exame}:\n\n${resultadosText}`);
                    } else {
                        Utils.notify('Nenhum resultado encontrado para este exame.');
                    }
                } else {
                    Utils.notify('Erro ao carregar resultados do exame.');
                }
            })
            .catch(error => {
                console.error('Erro ao visualizar resultados:', error);
                Utils.notify('Erro ao visualizar resultados');
            });
    },

    /**
     * Exclui um exame
     */
    delete: function(exameId) {
        if (!Utils.confirm('Tem certeza que deseja excluir este exame?')) return;
        
        const url = Utils.buildUrl('/atendimento/exame/' + exameId);
        
        Utils.request(url, { method: 'DELETE' })
            .then(data => {
                if (data.success) {
                    Utils.notify('Exame excluído com sucesso!');
                    // Remover apenas o item específico da lista
                    this.removeExameItem(exameId);
                } else {
                    Utils.notify('Erro ao excluir exame: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro ao excluir exame:', error);
                Utils.notify('Erro ao excluir exame');
            });
    },

    /**
     * Adiciona um novo exame à lista sem recarregar
     */
    addExameToList: function(exame) {
        // Determinar o container correto baseado no status
        let containerId;
        switch(exame.status) {
            case 'solicitado':
                containerId = 'examesSolicitados';
                break;
            case 'em_andamento':
                containerId = 'examesAndamento';
                break;
            case 'concluido':
                containerId = 'examesConcluidos';
                break;
            default:
                containerId = 'examesSolicitados';
        }
        
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Remover mensagem de lista vazia se existir
        const emptyState = container.querySelector('.empty-exames');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Criar e adicionar o novo elemento de exame
        const exameElement = this.createExameElement(exame);
        container.insertBefore(exameElement, container.firstChild); // Adicionar no início
    },

    /**
     * Atualiza um item específico da lista sem recarregar tudo
     */
    updateExameItem: function(exameId, updates) {
        // Buscar em todos os containers
        const containers = [
            document.getElementById('examesSolicitados'),
            document.getElementById('examesAndamento'),
            document.getElementById('examesConcluidos')
        ];
        
        let exameElement = null;
        let currentContainer = null;
        
        // Encontrar o exame em qualquer container
        containers.forEach(container => {
            if (container && !exameElement) {
                const items = container.querySelectorAll('.exame-card');
                items.forEach(item => {
                    const itemId = item.getAttribute('data-exame-id');
                    if (itemId == exameId) {
                        exameElement = item;
                        currentContainer = container;
                    }
                });
            }
        });
        
        if (!exameElement) return;
        
        // Se o status mudou, mover para o container correto
        if (updates.status) {
            let newContainerId;
            switch(updates.status) {
                case 'solicitado':
                    newContainerId = 'examesSolicitados';
                    break;
                case 'em_andamento':
                    newContainerId = 'examesAndamento';
                    break;
                case 'concluido':
                    newContainerId = 'examesConcluidos';
                    break;
            }
            
            const newContainer = document.getElementById(newContainerId);
            if (newContainer && newContainer !== currentContainer) {
                // Remover do container atual
                exameElement.remove();
                
                // Remover mensagem vazia do novo container se existir
                const emptyState = newContainer.querySelector('.empty-exames');
                if (emptyState) {
                    emptyState.remove();
                }
                
                // Atualizar dados do exame
                const statusElement = exameElement.querySelector('.exame-status');
                if (statusElement) {
                    statusElement.textContent = this.getStatusText(updates.status);
                    statusElement.className = `exame-status status-${updates.status}`;
                }
                
                // Atualizar botões de ação
                const actionsElement = exameElement.querySelector('.exame-actions');
                if (actionsElement) {
                    const exameData = { id: exameId, status: updates.status };
                    actionsElement.innerHTML = this.getActionButtons(exameData);
                }
                
                // Adicionar ao novo container
                newContainer.appendChild(exameElement);
                
                // Verificar se o container antigo ficou vazio
                this.checkEmptyContainer(currentContainer);
            }
        }
        
        // Adicionar resultados se fornecido
        if (updates.resultados) {
            const detailsElement = exameElement.querySelector('.exame-details');
            if (detailsElement) {
                const resultadosP = document.createElement('p');
                resultadosP.innerHTML = `<strong>Resultados:</strong> ${updates.resultados}`;
                detailsElement.appendChild(resultadosP);
            }
        }
    },

    /**
     * Verifica se um container ficou vazio e adiciona mensagem apropriada
     */
    checkEmptyContainer: function(container) {
        if (!container || container.children.length > 0) return;
        
        const containerId = container.id;
        const emptyMessages = {
            'examesSolicitados': '<div class="empty-exames"><i class="fas fa-clock"></i><p>Nenhum exame solicitado</p></div>',
            'examesAndamento': '<div class="empty-exames"><i class="fas fa-play-circle"></i><p>Nenhum exame em andamento</p></div>',
            'examesConcluidos': '<div class="empty-exames"><i class="fas fa-check-circle"></i><p>Nenhum exame concluído</p></div>'
        };
        
        container.innerHTML = emptyMessages[containerId] || '<div class="empty-exames"><p>Nenhum exame</p></div>';
    },

    /**
     * Remove um item específico da lista
     */
    removeExameItem: function(exameId) {
        // Buscar em todos os containers
        const containers = [
            document.getElementById('examesSolicitados'),
            document.getElementById('examesAndamento'),
            document.getElementById('examesConcluidos')
        ];
        
        containers.forEach(container => {
            if (container) {
                const exameItems = container.querySelectorAll('.exame-card');
                exameItems.forEach(item => {
                    const itemId = item.getAttribute('data-exame-id');
                    if (itemId == exameId) {
                        item.remove();
                        // Verificar se o container ficou vazio
                        this.checkEmptyContainer(container);
                    }
                });
            }
        });
    },

    /**
     * Limpa o formulário
     */
    clearForm: function() {
        const fields = ['tipoExame', 'dataExame', 'laboratorio', 'medicoSolicitante', 'observacoesExame'];
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = '';
            }
        });
    },

    /**
     * Retorna o texto do status
     */
    getStatusText: function(status) {
        const statusTexts = {
            'solicitado': 'Solicitado',
            'realizado': 'Realizado',
            'cancelado': 'Cancelado'
        };
        return statusTexts[status] || status;
    }
};

// Funções globais para compatibilidade
function salvarExame() {
    ExameManager.save();
}

function carregarExames() {
    ExameManager.load();
}

function adicionarResultado() {
    ExameManager.adicionarResultado();
}

function salvarResultados() {
    ExameManager.saveResults();
}

function fecharModalResultados() {
    ExameManager.closeResultsModal();
}

function removerResultado(index) {
    ExameManager.removerResultado(index);
}

function atualizarListaResultados() {
    ExameManager.atualizarListaResultados();
}