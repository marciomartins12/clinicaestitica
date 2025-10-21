
const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbName = process.env.DB_NAME || process.env.db_name;
const dbUser = process.env.DB_USER || process.env.db_user;
const dbPass = process.env.DB_PASS || process.env.db_password;
const dbHost = process.env.DB_HOST || process.env.db_host;
const dbDialect = process.env.DB_DIALECT || 'mysql';

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  dialect: dbDialect,
  logging: false,
  timezone: '-03:00',
  dialectOptions: {
    timezone: 'local'
  }
});

async function ensureAgendamentoStatusNullable() {
  try {
    const [rows] = await sequelize.query(
      `SELECT IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = :schema
         AND TABLE_NAME = 'agendamentos'
         AND COLUMN_NAME = 'status'`,
      { replacements: { schema: dbName } }
    );

    const needsAlter = !rows || rows.length === 0 || rows[0].IS_NULLABLE === 'NO' || (rows[0].COLUMN_DEFAULT && rows[0].COLUMN_DEFAULT !== 'NULL');

    if (needsAlter) {
      await sequelize.query(
        "ALTER TABLE agendamentos MODIFY COLUMN status ENUM('aguardando','consultando','finalizado','cancelado','faltou') NULL DEFAULT NULL"
      );
    }
  } catch (e) {
    console.error('Falha ao ajustar coluna status para permitir NULL:', e.message);
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    await ensureAgendamentoStatusNullable();
    console.log('Conexão com o banco estabelecida com sucesso.');
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error);
  }
})();

module.exports = { sequelize };