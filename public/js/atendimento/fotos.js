/**
 * Gerenciamento da aba Fotos
 */

const FotoManager = {
    /**
     * Carrega a lista de fotos e procedimentos
     */
    load: function() {
        if (!currentPatientId) return;
        
        // Carregar fotos
        const urlFotos = Utils.buildUrl(CONFIG.ENDPOINTS.FOTOS + '/' + currentPatientId);
        
        Utils.request(urlFotos)
            .then(data => {
                if (data.success) {
                    this.renderGallery(data.data);
                }
            })
            .catch(error => {
                console.error('Erro ao carregar fotos:', error);
            });
            
        // Carregar procedimentos do paciente
        this.loadProcedimentos();
    },
    
    /**
     * Carrega os procedimentos do paciente
     */
    loadProcedimentos: function() {
        const urlProcedimentos = Utils.buildUrl(CONFIG.ENDPOINTS.EVOLUCAO + '/' + currentPatientId);
        
        Utils.request(urlProcedimentos)
            .then(data => {
                if (data.success) {
                    this.populateProcedimentoSelect(data.data);
                }
            })
            .catch(error => {
                console.error('Erro ao carregar procedimentos:', error);
            });
    },
    
    /**
     * Popula o select de procedimentos
     */
    populateProcedimentoSelect: function(agendamentos) {
        const select = document.getElementById('procedimentoFoto');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um procedimento (opcional)</option>';
        
        agendamentos.forEach(agendamento => {
            if (agendamento.produto && agendamento.produto.nome) {
                const option = document.createElement('option');
                option.value = agendamento.id;
                option.textContent = `${agendamento.produto.nome} - ${Utils.formatDate(agendamento.data_agendamento)}`;
                select.appendChild(option);
            }
        });
    },

    /**
     * Renderiza a galeria de fotos
     */
    renderGallery: function(fotos) {
        const container = document.getElementById('fotosGallery');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (fotos.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Nenhuma foto cadastrada.</p></div>';
            return;
        }
        
        fotos.forEach(foto => {
            const fotoElement = this.createFotoElement(foto);
            container.appendChild(fotoElement);
        });
    },

    /**
     * Cria elemento HTML para uma foto
     */
    createFotoElement: function(foto) {
        const div = document.createElement('div');
        div.className = 'foto-item';
        div.innerHTML = `
            <div class="foto-container">
                <img src="data:image/jpeg;base64,${foto.imagem_base64}" alt="${foto.titulo}" onclick="FotoManager.viewFullSize('${foto.imagem_base64}', '${foto.titulo}')">
                <div class="foto-overlay">
                    <button class="btn-icon" onclick="FotoManager.viewFullSize('${foto.imagem_base64}', '${foto.titulo}')" title="Ver em tamanho real">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="FotoManager.delete(${foto.id})" title="Excluir foto">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="foto-info">
                <h4>${foto.titulo}</h4>
                <p class="foto-date">${Utils.formatDate(foto.criado_em)}</p>
                ${foto.descricao ? `<p class="foto-description">${foto.descricao}</p>` : ''}
                <span class="foto-moment">${this.getMomentText(foto.momento_procedimento)}</span>
            </div>
        `;
        return div;
    },

    /**
     * Salva uma nova foto
     */
    save: function() {
        if (!currentPatientId) {
            Utils.notify('ID do paciente não encontrado');
            return;
        }

        const fileInput = document.getElementById('fotoInput');
        const titulo = document.getElementById('tituloFoto').value;
        const descricao = document.getElementById('descricaoFoto').value;
        const momentoProcedimento = document.getElementById('momentoProcedimento').value;
        const procedimentoId = document.getElementById('procedimentoFoto').value;

        if (!fileInput.files[0] || !titulo || !momentoProcedimento) {
            Utils.notify('Preencha todos os campos obrigatórios e selecione uma imagem');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1]; // Remove o prefixo data:image/...
            
            const foto = {
                paciente_id: currentPatientId,
                titulo: titulo,
                descricao: descricao,
                procedimento_id: procedimentoId || null,
                momento_procedimento: momentoProcedimento,
                imagem_base64: base64
            };

            const url = Utils.buildUrl(CONFIG.ENDPOINTS.FOTOS);
            
            Utils.request(url, {
                method: 'POST',
                body: JSON.stringify(foto)
            })
            .then(data => {
                if (data.success) {
                    Utils.notify('Foto salva com sucesso!');
                    this.clearForm();
                    // Adicionar a nova foto à galeria sem recarregar
                    this.addFotoToGallery({
                        id: data.data.id,
                        titulo: titulo,
                        descricao: descricao,
                        momento_procedimento: momentoProcedimento,
                        imagem_base64: base64,
                        criado_em: new Date().toISOString()
                    });
                } else {
                    Utils.notify('Erro ao salvar foto: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro ao salvar foto:', error);
                Utils.notify('Erro ao salvar foto');
            });
        };
        
        reader.readAsDataURL(file);
    },

    /**
     * Adiciona uma nova foto à galeria sem recarregar
     */
    addFotoToGallery: function(foto) {
        const container = document.getElementById('fotosGallery');
        if (!container) return;
        
        // Remover mensagem de lista vazia se existir
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Criar e adicionar o novo elemento de foto
        const fotoElement = this.createFotoElement(foto);
        container.insertBefore(fotoElement, container.firstChild); // Adicionar no início
    },

    /**
     * Exibe foto em tamanho real
     */
    viewFullSize: function(base64, titulo) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; justify-content: center; align-items: center;';
        
        modal.innerHTML = `
            <div style="position: relative; max-width: 90%; max-height: 90%;">
                <img src="data:image/jpeg;base64,${base64}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${titulo}">
                <button onclick="FotoManager.closeModal()" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.8); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; cursor: pointer;">&times;</button>
                <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 4px;">
                    <h4 style="margin: 0; color: white;">${titulo}</h4>
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
     * Exclui uma foto
     */
    delete: function(fotoId) {
        if (!Utils.confirm('Tem certeza que deseja excluir esta foto?')) return;
        
        // Implementar exclusão quando a rota estiver disponível
        Utils.notify('Funcionalidade de exclusão será implementada');
    },

    /**
     * Limpa o formulário
     */
    clearForm: function() {
        const fields = ['fotoInput', 'tituloFoto', 'descricaoFoto', 'momentoProcedimento', 'procedimentoFoto'];
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = '';
            }
        });
    },

    /**
     * Preview da imagem selecionada
     */
    previewImage: function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('imagePreview');
                if (preview) {
                    preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 4px;">`;
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    /**
     * Retorna o texto do momento do procedimento
     */
    getMomentText: function(momento) {
        const momentos = {
            'antes': 'Antes do Procedimento',
            'durante': 'Durante o Procedimento',
            'depois': 'Depois do Procedimento',
            'evolucao': 'Evolução'
        };
        return momentos[momento] || momento;
    }
};

// Funções globais para compatibilidade
function salvarFoto() {
    FotoManager.save();
}

function carregarFotos() {
    FotoManager.load();
}

function previewImage(input) {
    FotoManager.previewImage(input);
}