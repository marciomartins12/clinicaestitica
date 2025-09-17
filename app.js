const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const flash = require('express-flash');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    // Helmet para segurança em produção
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                scriptSrcAttr: ["'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"]
            }
        }
    }));
    
    // Rate limiting para produção
    const limiter = rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutos
        max: 500, // máximo 500 requests por IP
        message: 'Muitas tentativas. Tente novamente em 5 minutos.',
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use(limiter);
    
    // Rate limiting específico para login
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 50, // máximo 50 tentativas de login por IP
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        skipSuccessfulRequests: true,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            console.log(`Rate limit exceeded for IP: ${req.ip}`);
            req.flash('LoginError', 'Muitas tentativas de login. Tente novamente em 15 minutos.');
            res.redirect('/');
        }
    });
    app.use('/tryLogin', loginLimiter);
}


// Configurar Handlebars
app.engine('handlebars', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    extname: '.handlebars',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    },
    helpers: {
        eq: function(a, b) {
            return a === b;
        },
        not: function(value) {
            return !value;
        },
        and: function(a, b) {
            return a && b;
        },
        or: function(a, b) {
            return a || b;
        },
        formatDate: function(date) {
            if (!date) return '-';
            const d = new Date(date);
            return d.toLocaleDateString('pt-BR');
        },
        formatMoney: function(value) {
            if (!value) return '0,00';
            return parseFloat(value).toFixed(2).replace('.', ',');
        },
        formatDateTime: function(date) {
            if (!date) return '-';
            const d = new Date(date);
            return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        },
        add: function(a, b) {
            return parseFloat(a) + parseFloat(b);
        }
    }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));



// Configuração da sessão
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isProduction, 
        httpOnly: true, // Previne XSS
        maxAge: 4 * 60 * 60 * 1000, // 4 horas
        sameSite: isProduction ? 'strict' : 'lax' // CSRF protection
    }
}));

// Flash messages (deve vir após a configuração da sessão)
app.use(flash());

//rotas e controllers
const router = express.Router();
const rotasSistema = require('./routes/sistema');
const controllerAuth = require('./controllers/authController');
//usando rotas
// Middleware de log para tryLogin
router.use('/tryLogin', (req, res, next) => {
    console.log(`Requisição tryLogin - IP: ${req.ip}, Method: ${req.method}, Body:`, req.body);
    next();
});

router.get("/", controllerAuth.pageLogin);
router.post('/tryLogin', controllerAuth.tryLogin);
router.get('/logout', controllerAuth.logout);


// Registrar as rotas no app
app.use('/', router);
app.use("/sistema", rotasSistema);

// app.use((req, res, next) => {
//     res.status(404).send("Página não encontrada");
// });


// Iniciar servidor
app.listen(PORT, () => {
    if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 Servidor em PRODUÇÃO rodando na porta ${PORT}`);
    } else {
        console.log(`🔧 Servidor em DESENVOLVIMENTO: http://localhost:${PORT}`);
    }
});

module.exports = app;
