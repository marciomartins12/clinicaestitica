const bcrypt = require("bcryptjs");

const { Usuario: usuarioModel, Clinica: clinicaModel } = require('../models');

class authLogin {
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

            const usuarioEncontrado = await usuarioModel.findOne({
                where: {
                    email: email
                }
            })
            if (!usuarioEncontrado) {
                req.flash('LoginError', 'Email ou senha incorretos');
                return res.redirect('/');
            }
            const senhaValida = bcrypt.compareSync(senha, usuarioEncontrado.senha);
            if (!senhaValida) {
                req.flash('LoginError', 'Email ou senha incorretos');
                return res.redirect('/');
            }
            req.session.user = usuarioEncontrado;
            return res.redirect('/sistema/dashboard');
        } catch (err) {
            console.log(err);
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

module.exports = authLogin;