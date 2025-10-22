
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

async function ensureFotosPacienteProcedimentoColumn() {
  try {
    const [rows] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = :schema
         AND TABLE_NAME = 'fotos_pacientes'
         AND COLUMN_NAME = 'procedimento_id'`,
      { replacements: { schema: dbName } }
    );

    const exists = rows && rows.length > 0;
    if (!exists) {
      await sequelize.query(
        "ALTER TABLE fotos_pacientes ADD COLUMN procedimento_id INT NULL"
      );
      console.log("Coluna procedimento_id adicionada à tabela fotos_pacientes");
    }
  } catch (e) {
    console.error('Falha ao ajustar coluna procedimento_id em fotos_pacientes:', e.message);
  }
}

async function ensureFotosPacienteFotoLongBlob() {
  try {
    const [rows] = await sequelize.query(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = :schema
         AND TABLE_NAME = 'fotos_pacientes'
         AND COLUMN_NAME = 'foto'`,
      { replacements: { schema: dbName } }
    );

    const currentType = rows && rows[0] ? rows[0].DATA_TYPE : null;
    if (currentType && currentType.toLowerCase() !== 'longblob') {
      await sequelize.query(
        "ALTER TABLE fotos_pacientes MODIFY COLUMN foto LONGBLOB NOT NULL"
      );
      console.log("Coluna foto alterada para LONGBLOB em fotos_pacientes");
    }
  } catch (e) {
    console.error('Falha ao ajustar tipo da coluna foto em fotos_pacientes:', e.message);
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    await ensureAgendamentoStatusNullable();
    await ensureFotosPacienteProcedimentoColumn();
    await ensureFotosPacienteFotoLongBlob();
    console.log('Conexão com o banco estabelecida com sucesso.');
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error);
  }
})();

module.exports = { sequelize };