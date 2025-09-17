const bcrypt = require("bcryptjs");

const { Usuario: usuarioModel, Clinica: clinicaModel } = require('../models');

class authController {
    static async pageLogin(req, res) {
        clinicaModel.findOne({
            where: {
                id: 1
            }
        }).then((clinic) => {
            
            res.render("login", {
                LoginError: req.flash('LoginError'),
                nomeclinica: clinic.dataValues.nome,
                cidade: clinic.dataValues.cidade,
                endereco: clinic.dataValues.endereco,
                telefone: clinic.dataValues.telefone,

            });
        })
    }


    static async tryLogin(req, res) {
        try {
            const { email, senha } = req.body;

            // Validação básica dos dados
            if (!email || !senha) {
                req.flash('LoginError', 'Email e senha são obrigatórios');
                return res.redirect('/');
            }

            const usuarioEncontrado = await usuarioModel.findOne({
                where: {
                    email: email
                }
            });
            
            if (!usuarioEncontrado) {
                console.log(`Tentativa de login com email inexistente: ${email}`);
                req.flash('LoginError', 'Email ou senha incorretos');
                return res.redirect('/');
            }
            
            const senhaValida = bcrypt.compareSync(senha, usuarioEncontrado.senha);
            if (!senhaValida) {
                console.log(`Tentativa de login com senha incorreta para: ${email}`);
                req.flash('LoginError', 'Email ou senha incorretos');
                return res.redirect('/');
            }
            
            console.log(`Login bem-sucedido para: ${email}`);
            req.session.user = usuarioEncontrado;
            return res.redirect('/sistema/dashboard');
        } catch (err) {
            console.error('Erro no tryLogin:', err);
            req.flash('LoginError', 'Erro interno do servidor. Tente novamente.');
            return res.redirect('/');
        }
    }
    
    static async logout(req, res) {
        req.session.destroy();
        res.redirect('/');
    }

    static async isLoggedIn(req, res, next) {
        if (req.session.user) {
            return next();
        }
        req.session.destroy();
        res.redirect('/');
    }
  

}

module.exports = authController;