const { Router } = require('express');
const router = Router();
const authController = require('../controllers/authController');
const RecadoController = require('../controllers/recadoController');
const AgendamentoController = require('../controllers/agendamentoController');
const AtendimentoController = require('../controllers/atendimentoController');
const FinanceiroController = require('../controllers/financeiroController');
const ProdutoController = require('../controllers/produtoController');
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
router.get('/agendamentos/:id', authController.isLoggedIn, AgendamentoController.buscarAgendamentoPorId);
router.post('/agendamentos', authController.isLoggedIn, AgendamentoController.criarAgendamento);
router.put('/agendamentos/:id', authController.isLoggedIn, AgendamentoController.atualizarAgendamento);
router.put('/agendamentos/:id/status', authController.isLoggedIn, AgendamentoController.alterarStatus);
router.delete('/agendamentos/:id', authController.isLoggedIn, AgendamentoController.excluirAgendamento);
// Novo endpoint: reagendar criando novo agendamento a partir de um "faltou"
router.post('/agendamentos/:id/reagendar', authController.isLoggedIn, AgendamentoController.reagendarAgendamento);
router.post('/agendamentos/:id/pagamento', authController.isLoggedIn, AgendamentoController.confirmarPagamento);
router.delete('/agendamentos/:id', authController.isLoggedIn, AgendamentoController.excluirAgendamento);
router.get('/pacientes/buscar', authController.isLoggedIn, AgendamentoController.buscarPacientes);
router.get('/profissionais', authController.isLoggedIn, AgendamentoController.buscarProfissionais);
// Rota para página de produtos
router.get('/produtos', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        
        // Verificar se o usuário não é atendente
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Produtos para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        
        // Buscar dados da clínica
        const clinica = await Clinica.findOne();
        
        res.render('pages/produto', {
            user: user,
            clinica: clinica || { nome: 'Clínica' }
        });
    } catch (error) {
        console.error('Erro ao carregar página de produtos:', error);
        res.redirect('/sistema/dashboard');
    }
});

// Rota para renderizar a página Minha Clínica
router.get('/minha-clinica', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        
        if (!user) {
            console.error('Usuário não encontrado na sessão:', req.session.user.id);
            return res.redirect('/sistema/dashboard');
        }
        
        // Verificar se o usuário é administrador
        if (user.tipo_usuario !== 'admin') {
            console.log(`Acesso negado à página Minha Clínica para usuário ${user.nome} (${user.tipo_usuario})`);
            return res.redirect('/sistema/dashboard');
        }
        
        // Buscar a clínica principal (ID 1)
        const clinica = await Clinica.findByPk(1);
        
        if (!clinica) {
            console.error('Clínica principal não encontrada');
            return res.redirect('/sistema/dashboard');
        }
        
        res.render('pages/minha-clinica', {
            user: user,
            clinica: clinica
        });
    } catch (error) {
        console.error('Erro ao carregar página Minha Clínica:', error);
        res.redirect('/sistema/dashboard');
    }
});

// APIs para usuários
router.get('/usuarios/api', authController.isLoggedIn, async (req, res) => {
    try {
        const { Usuario } = require('../models');
        
        const usuarios = await Usuario.findAll({
            where: {
                id: { [require('sequelize').Op.ne]: req.session.user.id }, // Excluir o usuário atual
                tipo_usuario: { [require('sequelize').Op.in]: ['profissional', 'atendente'] }
            },
            attributes: ['id', 'nome', 'email', 'cpf', 'rg', 'telefone', 'data_nascimento', 'endereco', 'tipo_usuario', 'data_admissao', 'salario', 'horario_trabalho', 'especialidade', 'registro', 'formacao', 'certificacoes', 'experiencia', 'setor', 'habilidades'],
            order: [['nome', 'ASC']]
        });
        
        res.json({
            success: true,
            data: usuarios
        });
        
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuários'
        });
    }
});

router.post('/usuarios/api', authController.isLoggedIn, async (req, res) => {
    try {
        const { Usuario } = require('../models');
        const bcrypt = require('bcrypt');
        
        // Verificar se o usuário atual é administrador
        const currentUser = await Usuario.findByPk(req.session.user.id);
        if (currentUser.tipo_usuario !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem criar usuários.'
            });
        }
        
        const { nome, email, cpf, rg, telefone, data_nascimento, endereco, senha, tipo_usuario, data_admissao, salario, horario_trabalho, especialidade, registro, formacao, certificacoes, experiencia, setor, habilidades } = req.body;
        
        // Validações
        if (!nome || !email || !senha || !tipo_usuario) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email, senha e tipo de usuário são obrigatórios'
            });
        }
        
        // Validar tipo de usuário
        if (!['profissional', 'atendente', 'admin'].includes(tipo_usuario)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de usuário inválido. Use: profissional, atendente ou admin'
            });
        }
        
        // Verificar se email já existe
        const emailExistente = await Usuario.findOne({ where: { email } });
        if (emailExistente) {
            return res.status(400).json({
                success: false,
                message: 'Email já está em uso'
            });
        }
        
        // Verificar se CPF já existe (se fornecido)
        if (cpf) {
            const cpfExistente = await Usuario.findOne({ where: { cpf } });
            if (cpfExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'CPF já está em uso'
                });
            }
        }
        
        // Criptografar senha
        const senhaHash = await bcrypt.hash(senha, 10);
        
        const novoUsuario = await Usuario.create({
            nome,
            email,
            cpf,
            rg,
            telefone,
            data_nascimento,
            endereco,
            senha: senhaHash,
            tipo_usuario,
            data_admissao,
            salario,
            horario_trabalho,
            especialidade,
            registro,
            formacao,
            certificacoes,
            experiencia,
            setor,
            habilidades
        });
        
        // Remover senha da resposta
        const { senha: _, ...usuarioSemSenha } = novoUsuario.toJSON();
        
        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            data: usuarioSemSenha
        });
        
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar usuário'
        });
    }
});

router.put('/usuarios/api/:id', authController.isLoggedIn, async (req, res) => {
    try {
        const { Usuario } = require('../models');
        const { id } = req.params;
        const currentUser = await Usuario.findByPk(req.session.user.id);
        
        // Verificar se o usuário atual é administrador
        if (currentUser.tipo_usuario !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem editar usuários.'
            });
        }
        
        const usuario = await Usuario.findByPk(id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        const { nome, email, cpf, rg, telefone, data_nascimento, endereco, data_admissao, salario, horario_trabalho, especialidade, registro, formacao, certificacoes, experiencia, setor, habilidades } = req.body;
        
        // Verificar se email já existe (exceto para o próprio usuário)
        if (email && email !== usuario.email) {
            const emailExistente = await Usuario.findOne({ where: { email } });
            if (emailExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Email já está em uso por outro usuário'
                });
            }
        }
        
        // Verificar se CPF já existe (exceto para o próprio usuário)
        if (cpf && cpf !== usuario.cpf) {
            const cpfExistente = await Usuario.findOne({ where: { cpf } });
            if (cpfExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'CPF já está em uso por outro usuário'
                });
            }
        }
        
        await usuario.update({
            nome,
            email,
            cpf,
            rg,
            telefone,
            data_nascimento,
            endereco,
            data_admissao,
            salario,
            horario_trabalho,
            especialidade,
            registro,
            formacao,
            certificacoes,
            experiencia,
            setor,
            habilidades
        });
        
        // Remover senha da resposta
        const { senha: _, ...usuarioAtualizado } = usuario.toJSON();
        
        res.json({
            success: true,
            message: 'Usuário atualizado com sucesso',
            data: usuarioAtualizado
        });
        
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar usuário'
        });
    }
});

router.delete('/usuarios/api/:id', authController.isLoggedIn, async (req, res) => {
    try {
        const { Usuario } = require('../models');
        const { id } = req.params;
        
        const usuario = await Usuario.findByPk(id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        // Não permitir excluir o próprio usuário
        if (usuario.id === req.session.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir seu próprio usuário'
            });
        }
        
        await usuario.destroy();
        
        res.json({
            success: true,
            message: 'Usuário excluído com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir usuário'
        });
    }
});

// APIs para clínica
router.put('/clinica/api', authController.isLoggedIn, async (req, res) => {
    try {
const { Clinica } = require('../models');
        const user = await Usuario.findByPk(req.session.user.id);
        
        // Verificar se o usuário é administrador
        if (user.tipo_usuario !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem atualizar dados da clínica.'
            });
        }
        
        // Buscar a clínica principal (ID 1)
        const clinica = await Clinica.findByPk(1);
        if (!clinica) {
            return res.status(404).json({
                success: false,
                message: 'Clínica não encontrada'
            });
        }
        
        await clinica.update(req.body);
        
        res.json({
            success: true,
            message: 'Configurações da clínica atualizadas com sucesso',
            data: clinica
        });
        
    } catch (error) {
        console.error('Erro ao atualizar clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar configurações da clínica'
        });
    }
});

// APIs para produtos
router.get('/produtos/procedimentos', authController.isLoggedIn, AgendamentoController.buscarProdutos);
router.get('/produtos/api', authController.isLoggedIn, ProdutoController.buscarProdutos);
router.get('/produtos/api/:id', authController.isLoggedIn, ProdutoController.buscarProdutoPorId);
router.post('/produtos/api', authController.isLoggedIn, ProdutoController.criarProduto);
router.put('/produtos/api/:id', authController.isLoggedIn, ProdutoController.atualizarProduto);
router.delete('/produtos/api/:id', authController.isLoggedIn, ProdutoController.excluirProduto);
router.get('/produtos/todos', authController.isLoggedIn, AgendamentoController.buscarTodosProdutos);

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

// Rotas para atendimento - APIs
router.post('/atendimento/anamnese', authController.isLoggedIn, AtendimentoController.salvarAnamnese);
router.get('/atendimento/anamnese/:pacienteId', authController.isLoggedIn, AtendimentoController.buscarAnamnese);
router.post('/atendimento/atestado', authController.isLoggedIn, AtendimentoController.salvarAtestado);
router.get('/atendimento/atestados/:pacienteId', authController.isLoggedIn, AtendimentoController.buscarAtestados);
router.post('/atendimento/exame', authController.isLoggedIn, AtendimentoController.salvarExame);
router.get('/atendimento/exames/:pacienteId', authController.isLoggedIn, AtendimentoController.buscarExames);
router.put('/atendimento/exame/status', authController.isLoggedIn, AtendimentoController.atualizarStatusExame);
router.put('/atendimento/exame/resultado', authController.isLoggedIn, AtendimentoController.salvarResultadosExame);
router.delete('/atendimento/exame/:exameId', authController.isLoggedIn, AtendimentoController.apagarExame);
router.post('/atendimento/foto', authController.isLoggedIn, AtendimentoController.salvarFoto);
router.get('/atendimento/fotos/:pacienteId', authController.isLoggedIn, AtendimentoController.buscarFotos);
router.delete('/atendimento/foto/:fotoId', authController.isLoggedIn, AtendimentoController.excluirFoto);
router.post('/atendimento/prescricao', authController.isLoggedIn, AtendimentoController.salvarPrescricao);
router.get('/atendimento/prescricoes/:pacienteId', authController.isLoggedIn, AtendimentoController.buscarPrescricoes);
router.get('/atendimento/historico/:pacienteId', authController.isLoggedIn, AtendimentoController.buscarHistorico);
router.get('/atendimento/medicamentos', authController.isLoggedIn, AtendimentoController.buscarMedicamentos);
router.get('/atendimento/evolucao/:pacienteId', authController.isLoggedIn, AgendamentoController.buscarAgendamentos);
router.post('/atendimento/finalizar/:pacienteId', authController.isLoggedIn, AtendimentoController.finalizarAtendimento);

// Rota para atendimento
router.get('/atendimento', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        
        // Verificar se o usuário não é atendente
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Atendimento para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        
        // Buscar dados da clínica
        const clinica = await Clinica.findOne();
        
        res.render('pages/atendimento', {
            user: user,
            clinica: clinica || { nome: 'Clínica' },
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar página de atendimento:', error);
        res.render('pages/atendimento', {
            user: req.session.user,
            clinica: { nome: 'Clínica' },
            error: ['Erro ao carregar página de atendimento']
        });
    }
});

// Rota para atendimento específico do paciente
router.get('/atendimento/:id', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        const pacienteId = req.params.id;
        
        // Verificar se o usuário não é atendente
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Atendimento do Paciente para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        
        // Buscar dados da clínica
        const clinica = await Clinica.findOne();
        
        // Buscar dados do paciente
        const { Paciente } = require('../models');
        const paciente = await Paciente.findByPk(pacienteId);
        
        if (!paciente) {
            req.flash('error', 'Paciente não encontrado');
            return res.redirect('/sistema/atendimento');
        }
        
        res.render('pages/atendimento-paciente', {
            user: user,
            clinica: clinica || { nome: 'Clínica' },
            paciente: paciente,
            activeTab: 'anamnese',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar atendimento do paciente:', error);
        req.flash('error', 'Erro ao carregar atendimento do paciente');
        res.redirect('/sistema/atendimento');
    }
});

// Rotas por item de atendimento do paciente
router.get('/atendimento/:id/anamnese', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        const pacienteId = req.params.id;
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Anamnese para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        const clinica = await Clinica.findOne();
        const { Paciente } = require('../models');
        const paciente = await Paciente.findByPk(pacienteId);
        if (!paciente) {
            req.flash('error', 'Paciente não encontrado');
            return res.redirect('/sistema/atendimento');
        }
        res.render('pages/atendimento-paciente', {
            user,
            clinica: clinica || { nome: 'Clínica' },
            paciente,
            activeTab: 'anamnese',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar anamnese:', error);
        req.flash('error', 'Erro ao carregar anamnese');
        res.redirect('/sistema/atendimento');
    }
});

router.get('/atendimento/:id/exames', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        const pacienteId = req.params.id;
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Exames para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        const clinica = await Clinica.findOne();
        const { Paciente } = require('../models');
        const paciente = await Paciente.findByPk(pacienteId);
        if (!paciente) {
            req.flash('error', 'Paciente não encontrado');
            return res.redirect('/sistema/atendimento');
        }
        res.render('pages/atendimento-paciente', {
            user,
            clinica: clinica || { nome: 'Clínica' },
            paciente,
            activeTab: 'exames',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar exames:', error);
        req.flash('error', 'Erro ao carregar exames');
        res.redirect('/sistema/atendimento');
    }
});

router.get('/atendimento/:id/fotos', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        const pacienteId = req.params.id;
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Fotos para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        const clinica = await Clinica.findOne();
        const { Paciente } = require('../models');
        const paciente = await Paciente.findByPk(pacienteId);
        if (!paciente) {
            req.flash('error', 'Paciente não encontrado');
            return res.redirect('/sistema/atendimento');
        }
        res.render('pages/atendimento-paciente', {
            user,
            clinica: clinica || { nome: 'Clínica' },
            paciente,
            activeTab: 'fotos',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar fotos:', error);
        req.flash('error', 'Erro ao carregar fotos');
        res.redirect('/sistema/atendimento');
    }
});

router.get('/atendimento/:id/evolucao', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        const pacienteId = req.params.id;
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Evolução para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        const clinica = await Clinica.findOne();
        const { Paciente } = require('../models');
        const paciente = await Paciente.findByPk(pacienteId);
        if (!paciente) {
            req.flash('error', 'Paciente não encontrado');
            return res.redirect('/sistema/atendimento');
        }
        res.render('pages/atendimento-paciente', {
            user,
            clinica: clinica || { nome: 'Clínica' },
            paciente,
            activeTab: 'evolucao',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar evolução:', error);
        req.flash('error', 'Erro ao carregar evolução');
        res.redirect('/sistema/atendimento');
    }
});

router.get('/atendimento/:id/atestado', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        const pacienteId = req.params.id;
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Atestado para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        const clinica = await Clinica.findOne();
        const { Paciente } = require('../models');
        const paciente = await Paciente.findByPk(pacienteId);
        if (!paciente) {
            req.flash('error', 'Paciente não encontrado');
            return res.redirect('/sistema/atendimento');
        }
        res.render('pages/atendimento-paciente', {
            user,
            clinica: clinica || { nome: 'Clínica' },
            paciente,
            activeTab: 'atestado',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar atestado:', error);
        req.flash('error', 'Erro ao carregar atestado');
        res.redirect('/sistema/atendimento');
    }
});

router.get('/atendimento/:id/prescricao', authController.isLoggedIn, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.session.user.id);
        const pacienteId = req.params.id;
        if (user.tipo_usuario === 'atendente') {
            console.log(`Acesso negado à página Prescrição para atendente ${user.nome}`);
            return res.redirect('/sistema/dashboard');
        }
        const clinica = await Clinica.findOne();
        const { Paciente } = require('../models');
        const paciente = await Paciente.findByPk(pacienteId);
        if (!paciente) {
            req.flash('error', 'Paciente não encontrado');
            return res.redirect('/sistema/atendimento');
        }
        res.render('pages/atendimento-paciente', {
            user,
            clinica: clinica || { nome: 'Clínica' },
            paciente,
            activeTab: 'prescricao',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar prescrição:', error);
        req.flash('error', 'Erro ao carregar prescrição');
        res.redirect('/sistema/atendimento');
    }
});
// Rotas para financeiro
router.get('/financeiro', authController.isLoggedIn, FinanceiroController.pageFinanceiro);
router.get('/financeiro/dashboard', authController.isLoggedIn, FinanceiroController.buscarDashboardFinanceiro);
router.get('/financeiro/relatorio', authController.isLoggedIn, FinanceiroController.buscarRelatorioDetalhado);
router.get('/financeiro/pagamentos-paciente/:id', authController.isLoggedIn, FinanceiroController.buscarPagamentosPaciente);
router.post('/financeiro/gerar-comprovante', authController.isLoggedIn, FinanceiroController.gerarComprovante);

module.exports = router;