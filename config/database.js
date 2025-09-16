
const { Sequelize } = require("sequelize");
require('dotenv').config();

// Configuração da conexão com MySQL (XAMPP)
const dbConfig = {
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_password,
    database: process.env.db_name,
    port: process.env.db_port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    dialect: "mysql"
});

sequelize.authenticate().then(() => {
    console.log("banco de dados conectado com sucesso!")
}).catch( err => {
    console.log(`Erro ao conectar ao banco de dados./n o erro: ${err}`)
});

module.exports = {
    sequelize, Sequelize
};