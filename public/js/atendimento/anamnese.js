/**
 * Gerenciamento da aba Anamnese
 */

const AnamneseManager = {
    /**
     * Carrega os dados da anamnese
     */
    load: function() {
        if (!currentPatientId) return;
        
        const url = Utils.buildUrl(CONFIG.ENDPOINTS.ANAMNESE + '/' + currentPatientId);
        
        Utils.request(url)
            .then(data => {
                if (data.success && data.data) {
                    this.populateForm(data.data);
                }
            })
            .catch(error => {
                console.error('Erro ao carregar anamnese:', error);
            });
    },

    /**
     * Preenche o formulário com os dados da anamnese
     */
    populateForm: function(anamnese) {
        const fields = {
            'queixaPrincipal': anamnese.queixa_principal,
            'historiaDoenca': anamnese.historia_doenca,
            'antecedentesPessoais': anamnese.antecedentes_pessoais,
            'medicamentosUso': anamnese.medicamentos_uso,
            'exameFisico': anamnese.exame_fisico
        };

        Object.keys(fields).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element && fields[fieldId]) {
                element.value = fields[fieldId];
            }
        });
    },

    /**
     * Salva a anamnese
     */
    save: function() {
        if (!currentPatientId) {
            Utils.notify('ID do paciente não encontrado');
            return;
        }

        const anamnese = {
            paciente_id: currentPatientId,
            queixa_principal: document.getElementById('queixaPrincipal').value,
            historia_doenca: document.getElementById('historiaDoenca').value,
            antecedentes_pessoais: document.getElementById('antecedentesPessoais').value,
            medicamentos_uso: document.getElementById('medicamentosUso').value,
            exame_fisico: document.getElementById('exameFisico').value
        };

        const url = Utils.buildUrl(CONFIG.ENDPOINTS.ANAMNESE);
        
        Utils.request(url, {
            method: 'POST',
            body: JSON.stringify(anamnese)
        })
        .then(data => {
            if (data.success) {
                Utils.notify('Anamnese salva com sucesso!');
                // Adicionar feedback visual de sucesso
                this.showSaveSuccess();
            } else {
                Utils.notify('Erro ao salvar anamnese: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar anamnese:', error);
            Utils.notify('Erro ao salvar anamnese');
        });
    },

    /**
     * Mostra feedback visual de sucesso no salvamento
     */
    showSaveSuccess: function() {
        const saveButton = document.querySelector('button[onclick="salvarAnamnese()"]');
        if (saveButton) {
            const originalText = saveButton.innerHTML;
            saveButton.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            saveButton.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                saveButton.innerHTML = originalText;
                saveButton.style.backgroundColor = '';
            }, 2000);
        }
    }
};

// Função global para compatibilidade
function salvarAnamnese() {
    AnamneseManager.save();
}

// Função global para compatibilidade
function salvarAnamnese() {
    AnamneseManager.save();
}