const { Router } = require('express');
const router = Router();
const authController = require('../controllers/authController');
const RecadoController = require('../controllers/recadoController');
const AgendamentoController = require('../controllers/agendamentoController');
const { Usuario, Clinica } = require('../models');
const PacienteController = require('../controllers/pacienteController');

router.get('/dashboard', authController.isLoggedIn, async (req, res) => {
    try {
        const user = req.session.user;
        
        // Buscar dados da clínica
        const clinica = await Clinica.findOne();
        
        // Buscar recados para a dashboard
        const recados = await RecadoController.buscarRecadosDashboard(req, res);
        
        // Buscar usuários para o select de destinatário
        const usuarios = await Usuario.findAll({
            where: { status: 'ativo' },
            attributes: ['id', 'nome', 'tipo_usuario'],
            order: [['nome', 'ASC']]
        });
        
        res.render('pages/dashboard', {
            user: user,
            clinica: clinica || { nome: 'Clínica' },
            recados: recados,
            usuarios: usuarios,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        res.render('pages/dashboard', {
            user: req.session.user,
            clinica: { nome: 'Clínica' },
            recados: [],
            usuarios: [],
            error: ['Erro ao carregar recados']
        });
    }
});

// Rota para agenda
router.get('/agenda', authController.isLoggedIn, async (req, res) => {
    try {
        const user = req.session.user;
        
        // Buscar dados da clínica
        const clinica = await Clinica.findOne();
        
        res.render('pages/agenda', {
            user: user,
            clinica: clinica || { nome: 'Clínica' },
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        res.render('pages/agenda', {
            user: req.session.user,
            clinica: { nome: 'Clínica' },
            error: ['Erro ao carregar agenda']
        });
    }
});

// Rotas para agendamentos
router.get('/agendamentos', authController.isLoggedIn, AgendamentoController.buscarAgendamentos);
router.post('/agendamentos', authController.isLoggedIn, AgendamentoController.criarAgendamento);
router.get('/agendamentos/:id', authController.isLoggedIn, AgendamentoController.buscarAgendamentoPorId);
router.put('/agendamentos/:id', authController.isLoggedIn, AgendamentoController.atualizarAgendamento);
router.put('/agendamentos/:id/status', authController.isLoggedIn, AgendamentoController.alterarStatus);
router.delete('/agendamentos/:id', authController.isLoggedIn, AgendamentoController.excluirAgendamento);
router.get('/pacientes/buscar', authController.isLoggedIn, AgendamentoController.buscarPacientes);
router.get('/profissionais', authController.isLoggedIn, AgendamentoController.buscarProfissionais);
router.get('/produtos/procedimentos', authController.isLoggedIn, AgendamentoController.buscarProdutos);
router.get('/produtos', authController.isLoggedIn, AgendamentoController.buscarTodosProdutos);

// Rotas para recados
router.post('/recados', authController.isLoggedIn, RecadoController.criarRecado);
router.put('/recados/:id/lido', authController.isLoggedIn, RecadoController.marcarComoLido);
router.delete('/recados/:id', authController.isLoggedIn, RecadoController.desativarRecado);
router.get('/usuarios', authController.isLoggedIn, RecadoController.buscarUsuarios);

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// Rotas para pacientes
router.get('/pacientes', authController.isLoggedIn, PacienteController.pagePaciente);
router.get('/pacientes/api', authController.isLoggedIn, PacienteController.buscarPacientes);
router.post('/pacientes/api', authController.isLoggedIn, PacienteController.criarPaciente);
router.get('/pacientes/api/:id', authController.isLoggedIn, PacienteController.buscarPacientePorId);
router.put('/pacientes/api/:id', authController.isLoggedIn, PacienteController.atualizarPaciente);
router.delete('/pacientes/api/:id', authController.isLoggedIn, PacienteController.excluirPaciente);
router.get('/pacientes/selecao', authController.isLoggedIn, PacienteController.buscarPacientesParaSelecao);


module.exports = router;