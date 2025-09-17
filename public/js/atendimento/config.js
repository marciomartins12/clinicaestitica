/**
 * Configurações e utilitários para o sistema de atendimento
 */

// Variáveis globais
if (typeof currentPatientId === 'undefined') {
    var currentPatientId = null;
}
if (typeof currentPatientName === 'undefined') {
    var currentPatientName = null;
}

// Configurações da aplicação
const CONFIG = {
    API_BASE_URL: '/sistema',
    ENDPOINTS: {
        AGENDAMENTOS: '/agendamentos',
        EVOLUCAO: '/atendimento/evolucao',
        PAGAMENTO: '/agendamentos/{id}/pagamento',
        STATUS: '/agendamentos/{id}/status',
        PROFISSIONAIS: '/profissionais',
        PRODUTOS: '/produtos',
        ANAMNESE: '/atendimento/anamnese',
        EXAMES: '/atendimento/exames',
        FOTOS: '/atendimento/fotos',
        PRESCRICOES: '/atendimento/prescricoes',
        MEDICAMENTOS: '/atendimento/medicamentos'
    },
    STATUS_COLORS: {
        'agendado': 'status-agendado',
        'confirmado': 'status-confirmado',
        'em_andamento': 'status-em-andamento',
        'concluido': 'status-concluido',
        'realizado': 'status-realizado',
        'cancelado': 'status-cancelado',
        'faltou': 'status-faltou'
    },
    STATUS_TEXTS: {
        'agendado': 'Agendado',
        'confirmado': 'Confirmado',
        'em_andamento': 'Em Andamento',
        'concluido': 'Concluído',
        'realizado': 'Realizado',
        'cancelado': 'Cancelado',
        'faltou': 'Faltou'
    }
};

// Utilitários
const Utils = {
    /**
     * Formata valor monetário
     */
    formatCurrency: (value) => {
        return `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;
    },

    /**
     * Formata data para exibição
     */
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('pt-BR');
    },

    /**
     * Formata horário
     */
    formatTime: (date) => {
        return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Faz requisição HTTP
     */
    request: async (url, options = {}) => {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            // Verificar se a resposta é válida
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Redirecionar para login se não autenticado
                    window.location.href = '/login';
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Verificar se o conteúdo é JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                if (text.includes('<!DOCTYPE')) {
                    // Página HTML retornada, provavelmente erro de autenticação
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Resposta não é JSON válido');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    },

    /**
     * Exibe notificação
     */
    notify: (message, type = 'info') => {
        // Por enquanto usando alert, pode ser substituído por toast
        alert(message);
    },

    /**
     * Confirma ação do usuário
     */
    confirm: (message) => {
        return confirm(message);
    },

    /**
     * Substitui placeholders na URL
     */
    buildUrl: (endpoint, params = {}) => {
        let url = CONFIG.API_BASE_URL + endpoint;
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        return url;
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Extrair ID do paciente da URL
    const urlParts = window.location.pathname.split('/');
    currentPatientId = urlParts[urlParts.length - 1];
    
    // Extrair nome do paciente do DOM
    const nameElement = document.getElementById('patientName');
    if (nameElement) {
        currentPatientName = nameElement.textContent;
    }
});