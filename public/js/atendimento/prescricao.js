/**
 * Gerenciamento da aba Prescrição
 */

const PrescricaoManager = {
    medicamentos: [],
    
    /**
     * Carrega os dados da prescrição
     */
    load: function() {
        if (!currentPatientId) return;
        
        this.loadMedicamentos();
        this.loadPrescricoes();
    },

    /**
     * Carrega a lista de medicamentos disponíveis
     */
    loadMedicamentos: function() {
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.MEDICAMENTOS);
        
        Utils.request(url)
            .then(data => {
                if (data.success) {
                    this.medicamentos = data.data;
                    this.populateMedicamentoSelect();
                }
            })
            .catch(error => {
                console.error('Erro ao carregar medicamentos:', error);
            });
    },

    /**
     * Carrega as prescrições do paciente
     */
    loadPrescricoes: function() {
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.PRESCRICOES + '/' + currentPatientId);
        
        Utils.request(url)
            .then(data => {
                if (data.success) {
                    this.renderPrescricoes(data.data);
                }
            })
            .catch(error => {
                console.error('Erro ao carregar prescrições:', error);
            });
    },

    /**
     * Popula o select de medicamentos
     */
    populateMedicamentoSelect: function() {
        const select = document.getElementById('medicamentoSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um medicamento</option>';
        
        this.medicamentos.forEach(medicamento => {
            const option = document.createElement('option');
            option.value = medicamento.nome;
            option.textContent = `${medicamento.nome} - ${medicamento.concentracao}`;
            select.appendChild(option);
        });
    },

    /**
     * Renderiza as prescrições
     */
    renderPrescricoes: function(prescricoes) {
        const container = document.getElementById('prescricoesList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (prescricoes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Nenhuma prescrição cadastrada.</p></div>';
            return;
        }
        
        prescricoes.forEach(prescricao => {
            const prescricaoElement = this.createPrescricaoElement(prescricao);
            container.appendChild(prescricaoElement);
        });
    },

    /**
     * Cria elemento HTML para uma prescrição
     */
    createPrescricaoElement: function(prescricao) {
        const div = document.createElement('div');
        div.className = 'prescricao-item';
        div.innerHTML = `
            <div class="prescricao-header">
                <h4>Prescrição - ${Utils.formatDate(prescricao.criado_em)}</h4>
                <button class="btn btn-sm btn-primary" onclick="PrescricaoManager.print(${prescricao.id})">
                    <i class="fas fa-print"></i> Imprimir
                </button>
            </div>
            <div class="prescricao-content">
                <p><strong>Conteúdo:</strong></p>
                <div class="prescricao-text">${prescricao.conteudo}</div>
                ${prescricao.medicamentos ? `
                    <p><strong>Medicamentos:</strong></p>
                    <div class="medicamentos-list">${prescricao.medicamentos}</div>
                ` : ''}
            </div>
        `;
        return div;
    },

    /**
     * Adiciona medicamento à prescrição
     */
    addMedicamento: function() {
        const medicamento = document.getElementById('medicamentoSelect').value;
        const dosagem = document.getElementById('dosagem').value;
        const frequencia = document.getElementById('frequencia').value;
        const duracao = document.getElementById('duracao').value;
        const observacoes = document.getElementById('observacoesMedicamento').value;

        if (!medicamento || !dosagem || !frequencia || !duracao) {
            Utils.notify('Preencha todos os campos obrigatórios do medicamento');
            return;
        }

        const medicamentoText = `${medicamento} - ${dosagem} - ${frequencia} por ${duracao}${observacoes ? ` (${observacoes})` : ''}`;
        
        const listaMedicamentos = document.getElementById('listaMedicamentos');
        const medicamentoItem = document.createElement('div');
        medicamentoItem.className = 'medicamento-item';
        medicamentoItem.innerHTML = `
            <span>${medicamentoText}</span>
            <button type="button" onclick="this.parentElement.remove()" class="btn-remove">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        listaMedicamentos.appendChild(medicamentoItem);
        
        // Limpar campos
        document.getElementById('medicamentoSelect').value = '';
        document.getElementById('dosagem').value = '';
        document.getElementById('frequencia').value = '';
        document.getElementById('duracao').value = '';
        document.getElementById('observacoesMedicamento').value = '';
    },

    /**
     * Salva a prescrição
     */
    save: function() {
        if (!currentPatientId) {
            Utils.notify('ID do paciente não encontrado');
            return;
        }

        const conteudo = document.getElementById('conteudoPrescricao').value;
        const medicamentosElements = document.querySelectorAll('#listaMedicamentos .medicamento-item span');
        const medicamentos = Array.from(medicamentosElements).map(el => el.textContent).join('\n');

        if (!conteudo && medicamentos.length === 0) {
            Utils.notify('Adicione pelo menos um conteúdo ou medicamento à prescrição');
            return;
        }

        const prescricao = {
            paciente_id: currentPatientId,
            conteudo: conteudo,
            medicamentos: medicamentos
        };

        const url = Utils.buildUrl(CONFIG.ENDPOINTS.PRESCRICOES);
        
        Utils.request(url, {
            method: 'POST',
            body: JSON.stringify(prescricao)
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Prescrição salva com sucesso!');
                this.clearForm();
                this.loadPrescricoes();
            } else {
                Utils.notify('Erro ao salvar prescrição: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar prescrição:', error);
            Utils.notify('Erro ao salvar prescrição');
        });
    },

    /**
     * Imprime uma prescrição
     */
    print: function(prescricaoId) {
        // Implementar impressão
        Utils.notify('Funcionalidade de impressão será implementada');
    },

    /**
     * Limpa o formulário
     */
    clearForm: function() {
        document.getElementById('conteudoPrescricao').value = '';
        document.getElementById('listaMedicamentos').innerHTML = '';
        
        const fields = ['medicamentoSelect', 'dosagem', 'frequencia', 'duracao', 'observacoesMedicamento'];
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = '';
            }
        });
    }
};

// Funções globais para compatibilidade
function carregarMedicamentos() {
    PrescricaoManager.loadMedicamentos();
}

function adicionarMedicamento() {
    PrescricaoManager.addMedicamento();
}

function salvarPrescricao() {
    PrescricaoManager.save();
}