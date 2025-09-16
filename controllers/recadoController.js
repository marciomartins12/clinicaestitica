const { Recado, Usuario } = require('../models');

class RecadoController {
    // Buscar recados para a dashboard
    static async buscarRecadosDashboard(req, res) {
        try {
            const usuarioId = req.session.user.id;
            const { Op } = require('sequelize');
            
            // Buscar recados públicos ativos e recados privados do usuário
            const recados = await Recado.findAll({
                where: {
                    ativo: true,
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { data_expiracao: null },
                                { data_expiracao: { [Op.gt]: new Date() } }
                            ]
                        },
                        {
                            [Op.or]: [
                                { publico: true },
                                { destinatario_id: usuarioId }
                            ]
                        }
                    ]
                },
                include: [{
                    model: Usuario,
                    as: 'autor',
                    attributes: ['nome']
                }],
                order: [['prioridade', 'DESC'], ['criado_em', 'DESC']],
                limit: 10
            });
            
            return recados;
        } catch (error) {
            console.error('Erro ao buscar recados:', error);
            throw error;
        }
    }
    
    // Criar novo recado
    static async criarRecado(req, res) {
        try {
            const { titulo, mensagem, tipo, destinatario_id, publico, prioridade, data_expiracao } = req.body;
            const autorId = req.session.user.id;
            
            // Validações básicas
            if (!titulo || !mensagem) {
                req.flash('error', 'Título e mensagem são obrigatórios');
                return res.redirect('/sistema/dashboard');
            }
            
            // Criar o recado
            const novoRecado = await Recado.create({
                titulo,
                mensagem,
                tipo: tipo || 'info',
                autor_id: autorId,
                destinatario_id: destinatario_id || null,
                publico: publico === 'true' || publico === true,
                prioridade: prioridade || 'media',
                data_expiracao: data_expiracao || null
            });
            
            req.flash('success', 'Recado criado com sucesso!');
            res.redirect('/sistema/dashboard');
            
        } catch (error) {
            console.error('Erro ao criar recado:', error);
            req.flash('error', 'Erro ao criar recado. Tente novamente.');
            res.redirect('/sistema/dashboard');
        }
    }
    
    // Marcar recado como lido
    static async marcarComoLido(req, res) {
        try {
            const { id } = req.params;
            const usuarioId = req.session.user.id;
            const { Op } = require('sequelize');
            
            const recado = await Recado.findOne({
                where: {
                    id,
                    [Op.or]: [
                        { publico: true },
                        { destinatario_id: usuarioId }
                    ]
                }
            });
            
            if (!recado) {
                return res.status(404).json({ error: 'Recado não encontrado' });
            }
            
            await recado.update({ lido: true });
            
            res.json({ success: true, message: 'Recado marcado como lido' });
            
        } catch (error) {
            console.error('Erro ao marcar recado como lido:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    
    // Desativar recado (apenas autor ou admin)
    static async desativarRecado(req, res) {
        try {
            const { id } = req.params;
            const usuarioId = req.session.user.id;
            const tipoUsuario = req.session.user.tipo_usuario;
            
            const recado = await Recado.findByPk(id);
            
            if (!recado) {
                return res.status(404).json({ error: 'Recado não encontrado' });
            }
            
            // Verificar se o usuário pode desativar (autor ou admin)
            if (recado.autor_id !== usuarioId && tipoUsuario !== 'admin') {
                return res.status(403).json({ error: 'Sem permissão para desativar este recado' });
            }
            
            await recado.update({ ativo: false });
            
            res.json({ success: true, message: 'Recado desativado com sucesso' });
            
        } catch (error) {
            console.error('Erro ao desativar recado:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    
    // Buscar usuários para destinatário
    static async buscarUsuarios(req, res) {
        try {
            const usuarios = await Usuario.findAll({
                where: { status: 'ativo' },
                attributes: ['id', 'nome', 'tipo_usuario'],
                order: [['nome', 'ASC']]
            });
            
            res.json(usuarios);
            
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = RecadoController;