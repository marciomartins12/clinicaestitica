/**
 * Gerenciamento da aba Fotos
 */

const FotoManager = {
    /**
     * Carrega a lista de fotos e procedimentos
     */
    load: function() {
        if (!currentPatientId) {
            return;
        }
        
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
        const urlProcedimentos = Utils.buildUrl(CONFIG.ENDPOINTS.EVOLUCAO + '/' + currentPatientId + '?expandir_produtos=true');
        
        Utils.request(urlProcedimentos)
            .then(data => {
                if (data.success) {
                    // Verificar se há dados paginados
                    let agendamentos = data.data;
                    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
                        // Se data.data é um objeto com paginação
                        agendamentos = data.data.data || data.data.rows || data.data;
                    }
                    
                    this.populateProcedimentoSelect(agendamentos);
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
        const select = document.getElementById('photoProcedure');
        
        if (!select) {
            // Tentar novamente após um delay
            setTimeout(() => {
                this.populateProcedimentoSelect(agendamentos);
            }, 500);
            return;
        }
        
        select.innerHTML = '<option value="">Selecione um procedimento (opcional)</option>';
        
        if (!agendamentos) {
            return;
        }
        
        // Verificar diferentes estruturas de dados possíveis
        let listaAgendamentos = agendamentos;
        
        // Se é um objeto com propriedade data (resposta paginada)
        if (agendamentos.data && Array.isArray(agendamentos.data)) {
            listaAgendamentos = agendamentos.data;
        }
        // Se é um objeto com propriedade rows (resposta do Sequelize)
        else if (agendamentos.rows && Array.isArray(agendamentos.rows)) {
            listaAgendamentos = agendamentos.rows;
        }
        // Se não é array, tentar converter
        else if (!Array.isArray(agendamentos)) {
            // Se é um objeto, tentar extrair array
            if (typeof agendamentos === 'object') {
                listaAgendamentos = Object.values(agendamentos).find(val => Array.isArray(val)) || [];
            } else {
                return;
            }
        }
        
        if (!Array.isArray(listaAgendamentos) || listaAgendamentos.length === 0) {
            return;
        }
        
        listaAgendamentos.forEach((agendamento) => {
            // Verificar diferentes estruturas possíveis
            const produto = agendamento.produto || agendamento.Produto;
            
            if (produto && produto.nome) {
                const option = document.createElement('option');
                option.value = agendamento.id;
                option.textContent = `${produto.nome} - ${Utils.formatDate(agendamento.data_agendamento)} - Status: ${agendamento.status}`;
                select.appendChild(option);
            }
        });
    },

    /**
     * Renderiza a galeria de fotos
     */
    renderGallery: function(fotos) {
        const container = document.getElementById('photosGallery');
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
        
        // Informações do procedimento se existir
        let procedimentoInfo = '';
        if (foto.procedimento && foto.procedimento.produto && foto.procedimento.produto.nome) {
            procedimentoInfo = `
                <p class="foto-procedimento">
                    <strong>Procedimento:</strong> ${foto.procedimento.produto.nome}
                </p>
            `;
        } else if (foto.Procedimento && foto.Procedimento.Produto && foto.Procedimento.Produto.nome) {
            procedimentoInfo = `
                <p class="foto-procedimento">
                    <strong>Procedimento:</strong> ${foto.Procedimento.Produto.nome}
                </p>
            `;
        } else if (foto.agendamento && foto.agendamento.produto && foto.agendamento.produto.nome) {
            procedimentoInfo = `
                <p class="foto-procedimento">
                    <strong>Procedimento:</strong> ${foto.agendamento.produto.nome}
                </p>
            `;
        } else if (foto.agendamento && foto.agendamento.Produto && foto.agendamento.Produto.nome) {
            procedimentoInfo = `
                <p class="foto-procedimento">
                    <strong>Procedimento:</strong> ${foto.agendamento.Produto.nome}
                </p>
            `;
        } else if (foto.procedimento_id) {
            procedimentoInfo = `
                <p class="foto-procedimento">
                    <strong>Procedimento:</strong> Vinculado (ID: ${foto.procedimento_id})
                </p>
            `;
        } else {
            procedimentoInfo = `
                <p class="foto-procedimento">
                    <strong>Procedimento:</strong> Não vinculado
                </p>
            `;
        }
        
        // Verificar se a imagem já tem o prefixo data:image
        const imageSrc = foto.imagem_base64.startsWith('data:') ? foto.imagem_base64 : `data:image/jpeg;base64,${foto.imagem_base64}`;
        
        div.innerHTML = `
            <div class="foto-container">
                <img src="${imageSrc}" alt="${foto.titulo}" onclick="FotoManager.viewFullSize('${foto.imagem_base64}', '${foto.titulo}')">
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
                <div class="foto-field">
                    <strong>Título:</strong> ${foto.titulo}
                </div>
                <div class="foto-field">
                    <strong>Data:</strong> ${Utils.formatDate(foto.criado_em)}
                </div>
                ${foto.descricao ? `<div class="foto-field"><strong>Descrição:</strong> ${foto.descricao}</div>` : ''}
                ${procedimentoInfo}
                <div class="foto-field">
                    <strong>Momento:</strong> <span class="foto-moment">${this.getMomentText(foto.momento_procedimento)}</span>
                </div>
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

        const fileInput = document.getElementById('fileInput');
        const titulo = document.getElementById('photoTitle').value;
        const descricao = document.getElementById('photoDescription').value;
        const momentoProcedimento = document.getElementById('photoMoment').value;
        const procedimentoId = document.getElementById('photoProcedure').value;
        const photoPreview = document.getElementById('photoPreview');

        // Verificar se há arquivo selecionado (via input ou preview)
        const hasFile = (fileInput && fileInput.files[0]) || (photoPreview && photoPreview.src && photoPreview.src !== '');
        
        if (!hasFile || !titulo || !momentoProcedimento) {
            Utils.notify('Preencha todos os campos obrigatórios e selecione uma imagem');
            return;
        }

        // Usar a imagem do preview se disponível, senão usar o arquivo do input
        let base64;
        
        if (photoPreview && photoPreview.src && photoPreview.src !== '') {
            // Usar imagem do preview (já está em formato data:image/...)
            let imagemCompleta = photoPreview.src;
            
            // Se o procedimentoId contém underscore, extrair o ID original do agendamento
            let agendamentoId = procedimentoId;
            if (procedimentoId && procedimentoId.includes('_')) {
                agendamentoId = procedimentoId.split('_')[0];
            }
            
            const foto = {
                paciente_id: currentPatientId,
                titulo: titulo,
                descricao: descricao,
                procedimento_id: agendamentoId || null,
                momento_procedimento: momentoProcedimento,
                imagem_base64: imagemCompleta
            };
            
            this.enviarFoto(foto);
        } else if (fileInput && fileInput.files[0]) {
            // Usar arquivo do input como fallback
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                base64 = e.target.result.split(',')[1]; // Remove o prefixo data:image/...
                
                // Se o procedimentoId contém underscore, extrair o ID original do agendamento
                let agendamentoId = procedimentoId;
                if (procedimentoId && procedimentoId.includes('_')) {
                    agendamentoId = procedimentoId.split('_')[0];
                }
                
                const foto = {
                    paciente_id: currentPatientId,
                    titulo: titulo,
                    descricao: descricao,
                    procedimento_id: agendamentoId || null,
                    momento_procedimento: momentoProcedimento,
                    imagem_base64: base64
                };
                
                this.enviarFoto(foto);
            };
            
            reader.readAsDataURL(file);
        }
    },
    
    /**
     * Envia a foto para o servidor
     */
    enviarFoto: function(foto) {
        const url = Utils.buildUrl('/atendimento/foto'); // Usar endpoint singular para POST
        
        Utils.request(url, {
            method: 'POST',
            body: JSON.stringify(foto)
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Foto salva com sucesso!');
                this.clearForm();
                // Buscar informações do procedimento selecionado
                const procedimentoSelect = document.getElementById('photoProcedure');
                let procedimentoInfo = null;
                
                if (procedimentoSelect && procedimentoSelect.value) {
                    const selectedOption = procedimentoSelect.options[procedimentoSelect.selectedIndex];
                    if (selectedOption && selectedOption.textContent) {
                        // Extrair nome do procedimento do texto da opção
                        const textoCompleto = selectedOption.textContent;
                        const nomeProcedimento = textoCompleto.split(' - ')[0]; // Pega só o nome antes da data
                        
                        procedimentoInfo = {
                            produto: {
                                nome: nomeProcedimento
                            }
                        };
                    }
                }
                
                // Adicionar a nova foto à galeria sem recarregar
                this.addFotoToGallery({
                    id: data.data.id,
                    titulo: foto.titulo,
                    descricao: foto.descricao,
                    momento_procedimento: foto.momento_procedimento,
                    imagem_base64: foto.imagem_base64,
                    criado_em: new Date().toISOString(),
                    procedimento: procedimentoInfo
                });
            } else {
                Utils.notify('Erro ao salvar foto: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar foto:', error);
            Utils.notify('Erro ao salvar foto: ' + error.message);
        });
    },

    /**
     * Adiciona uma nova foto à galeria sem recarregar
     */
    addFotoToGallery: function(foto) {
        const container = document.getElementById('photosGallery');
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
        
        // Verificar se a imagem já tem o prefixo data:image
        const imageSrc = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
        
        modal.innerHTML = `
            <div style="position: relative; max-width: 90%; max-height: 90%;">
                <img src="${imageSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${titulo}">
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
        
        const url = Utils.buildUrl('/atendimento/foto/' + fotoId);
        
        Utils.request(url, {
            method: 'DELETE'
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Foto excluída com sucesso!');
                // Remover a foto da galeria
                this.removeFotoFromGallery(fotoId);
            } else {
                Utils.notify('Erro ao excluir foto: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao excluir foto:', error);
            Utils.notify('Erro ao excluir foto: ' + error.message);
        });
    },
    
    /**
     * Remove uma foto da galeria sem recarregar
     */
    removeFotoFromGallery: function(fotoId) {
        const container = document.getElementById('photosGallery');
        if (!container) return;
        
        // Encontrar e remover o elemento da foto
        const fotoElements = container.querySelectorAll('.foto-item');
        fotoElements.forEach(element => {
            const deleteButton = element.querySelector(`button[onclick*="delete(${fotoId})"]`);
            if (deleteButton) {
                element.remove();
                
                // Se não há mais fotos, mostrar mensagem de lista vazia
                if (container.children.length === 0) {
                    container.innerHTML = '<p class="empty-state">Nenhuma foto encontrada para este paciente.</p>';
                }
            }
        });
    },

    /**
     * Limpa o formulário
     */
    clearForm: function() {
        document.getElementById('photoTitle').value = '';
        document.getElementById('photoDescription').value = '';
        document.getElementById('photoMoment').value = 'antes';
        document.getElementById('photoProcedure').value = '';
        document.getElementById('fileInput').value = '';
        
        // Limpar preview da imagem
        const preview = document.getElementById('photoPreview');
        if (preview) {
            preview.src = '';
        }
        
        // Esconder formulário
        const form = document.getElementById('photoForm');
        if (form) {
            form.style.display = 'none';
        }
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