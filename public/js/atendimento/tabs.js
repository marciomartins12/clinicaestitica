/**
 * Gerenciamento de abas do sistema de atendimento
 */

const TabManager = {
    /**
     * Abre uma aba específica
     */
    openTab: function(evt, tabName) {
        // Esconder todos os conteúdos das abas
        const tabContents = document.getElementsByClassName('tab-content');
        for (let i = 0; i < tabContents.length; i++) {
            tabContents[i].style.display = 'none';
        }

        // Remover classe active de todos os botões
        const tabButtons = document.getElementsByClassName('tab-btn');
        for (let i = 0; i < tabButtons.length; i++) {
            tabButtons[i].classList.remove('active');
        }

        // Mostrar o conteúdo da aba selecionada
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.style.display = 'block';
        }

        // Adicionar classe active ao botão clicado
        if (evt && evt.currentTarget) {
            evt.currentTarget.classList.add('active');
        }

        // Carregar dados específicos da aba
        this.loadTabData(tabName);
    },

    /**
     * Carrega dados específicos de cada aba
     */
    loadTabData: function(tabName) {
        if (!currentPatientId) return;

        switch(tabName) {
            case 'anamnese':
                AnamneseManager.load();
                break;
            case 'exames':
                ExameManager.load();
                break;
            case 'fotos':
                FotoManager.load();
                break;
            case 'evolucao':
                EvolucaoManager.load();
                break;
            case 'prescricao':
                PrescricaoManager.load();
                break;
            case 'atestado':
                // Carregar dados do atestado se necessário
                break;
        }
    },

    /**
     * Inicializa o sistema de abas
     */
    init: function() {
        // Abrir a primeira aba por padrão
        const firstTab = document.querySelector('.tab-btn.active');
        if (firstTab) {
            const tabName = firstTab.getAttribute('onclick').match(/'([^']+)'/)[1];
            this.openTab(null, tabName);
        }
    }
};

// Função global para compatibilidade
function openTab(evt, tabName) {
    TabManager.openTab(evt, tabName);
}

// Inicialização será controlada pelo main.js