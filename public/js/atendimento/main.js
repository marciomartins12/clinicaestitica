/**
 * Arquivo principal do sistema de atendimento
 * Inicializa todos os módulos e gerencia funcionalidades globais
 */

const AtendimentoApp = {
    /**
     * Inicializa a aplicação
     */
    init: function() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupMobileMenu();
    },

    /**
     * Configura os event listeners globais
     */
    setupEventListeners: function() {
        // Event listener para mudança de abas
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('tab-btn')) {
                const tabName = e.target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (tabName) {
                    TabManager.openTab(e, tabName);
                }
            }
        });

        // Event listener para formulários
        document.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            const formId = form.id;
            
            switch(formId) {
                case 'anamneseForm':
                    AnamneseManager.save();
                    break;
                case 'exameForm':
                    ExameManager.save();
                    break;
                case 'fotoForm':
                    FotoManager.save();
                    break;
                case 'prescricaoForm':
                    PrescricaoManager.save();
                    break;
            }
        });

        // Event listener para preview de imagem
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                FotoManager.previewImage(this);
            });
        }

        // Event listener para filtro de evolução
        const statusFiltro = document.getElementById('statusFiltro');
        if (statusFiltro) {
            statusFiltro.addEventListener('change', function() {
                EvolucaoManager.filter();
            });
        }
    },

    /**
     * Carrega dados iniciais
     */
    loadInitialData: function() {
        // Definir data atual nos campos de data
        const today = new Date().toISOString().split('T')[0];
        const todayISO = new Date().toISOString().split('T')[0];
        
        // Campos de data para exames
        const dataExame = document.getElementById('dataExame');
        if (dataExame) dataExame.value = today;
        
        // Campos de data para prescrição footer
        const dataPrescricaoFooter = document.getElementById('dataPrescricaoFooter');
        if (dataPrescricaoFooter) dataPrescricaoFooter.textContent = today;
        
        // Set default dates in filters
        const dataFim = document.getElementById('dataFim');
        if (dataFim) dataFim.value = todayISO;
        
        // Carregar dados iniciais das abas
        this.loadTabData();
    },

    /**
     * Carrega dados das abas
     */
    loadTabData: function() {
        // Carregar dados da aba ativa
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabName = activeTab.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (tabName) {
                TabManager.loadTabData(tabName);
            }
        }
    },

    /**
     * Configura o menu mobile
     */
    setupMobileMenu: function() {
        // Implementar funcionalidades do menu mobile se necessário
    },

    /**
     * Finaliza o atendimento
     */
    finalizarAtendimento: function() {
        if (!currentPatientId) {
            Utils.notify('ID do paciente não encontrado');
            return;
        }

        if (!Utils.confirm('Tem certeza que deseja finalizar este atendimento?')) {
            return;
        }

        const url = Utils.buildUrl('/atendimento/finalizar/' + currentPatientId);
        
        Utils.request(url, { method: 'POST' })
            .then(data => {
                if (data.success) {
                    Utils.notify('Atendimento finalizado com sucesso!');
                    // Redirecionar para a lista de atendimentos
                    setTimeout(() => {
                        window.location.href = '/sistema/atendimento';
                    }, 1500);
                } else {
                    Utils.notify('Erro ao finalizar atendimento: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro ao finalizar atendimento:', error);
                Utils.notify('Erro ao finalizar atendimento');
            });
    },

    /**
     * Gerencia o menu mobile
     */
    toggleMobileMenu: function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        }
    },

    /**
     * Fecha o menu mobile
     */
    closeMobileMenu: function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        }
    }
};

// Funções globais para compatibilidade com o HTML existente
function finalizarAtendimento() {
    AtendimentoApp.finalizarAtendimento();
}

function toggleMobileMenu() {
    AtendimentoApp.toggleMobileMenu();
}

function closeMobileMenu() {
    AtendimentoApp.closeMobileMenu();
}

// Inicialização será controlada pelo carregamento sequencial dos scripts

// Exportar para uso global
window.AtendimentoApp = AtendimentoApp;