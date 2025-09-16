const { Router } = require('express');
const router = Router();
const authLogin = require('../controllers/authLogin');
const RecadoController = require('../controllers/recadoController');
const AgendamentoController = require('../controllers/agendamentoController');
const { Usuario } = require('../models');

router.get('/dashboard', authLogin.isLoggedIn, async (req, res) => {
    try {
        const user = req.session.user;
        
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
            recados: recados,
            usuarios: usuarios,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        res.render('pages/dashboard', {
            user: req.session.user,
            recados: [],
            usuarios: [],
            error: ['Erro ao carregar recados']
        });
    }
});

// Rota para agenda
router.get('/agenda', authLogin.isLoggedIn, async (req, res) => {
    try {
        const user = req.session.user;
        
        res.render('pages/agenda', {
            user: user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        res.render('pages/agenda', {
            user: req.session.user,
            error: ['Erro ao carregar agenda']
        });
    }
});

// Rotas para agendamentos
router.get('/agendamentos', authLogin.isLoggedIn, AgendamentoController.buscarAgendamentos);
router.post('/agendamentos', authLogin.isLoggedIn, AgendamentoController.criarAgendamento);
router.get('/agendamentos/:id', authLogin.isLoggedIn, AgendamentoController.buscarAgendamentoPorId);
router.put('/agendamentos/:id', authLogin.isLoggedIn, AgendamentoController.atualizarAgendamento);
router.put('/agendamentos/:id/status', authLogin.isLoggedIn, AgendamentoController.alterarStatus);
router.delete('/agendamentos/:id', authLogin.isLoggedIn, AgendamentoController.excluirAgendamento);
router.get('/pacientes/buscar', authLogin.isLoggedIn, AgendamentoController.buscarPacientes);
router.get('/profissionais', authLogin.isLoggedIn, AgendamentoController.buscarProfissionais);
router.get('/produtos/procedimentos', authLogin.isLoggedIn, AgendamentoController.buscarProdutos);
router.get('/produtos', authLogin.isLoggedIn, AgendamentoController.buscarTodosProdutos);

// Rotas para recados
router.post('/recados', authLogin.isLoggedIn, RecadoController.criarRecado);
router.put('/recados/:id/lido', authLogin.isLoggedIn, RecadoController.marcarComoLido);
router.delete('/recados/:id', authLogin.isLoggedIn, RecadoController.desativarRecado);
router.get('/usuarios', authLogin.isLoggedIn, RecadoController.buscarUsuarios);

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;