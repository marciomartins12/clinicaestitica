// Script de migração: permitir NULL na coluna profissional_id em agendamentos
// Uso: node scripts/fix_profissional_null.js

const { sequelize } = require('../models');

async function run() {
  console.log('Iniciando migração para permitir NULL em agendamentos.profissional_id...');

  try {
    // Tornar a coluna NULLable e com DEFAULT NULL
    await sequelize.query('ALTER TABLE `agendamentos` MODIFY COLUMN `profissional_id` INT NULL DEFAULT NULL;');
    console.log('ALTER TABLE aplicado: profissional_id agora permite NULL.');

    // Normalizar registros antigos com 0 para NULL, se existirem
    await sequelize.query('UPDATE `agendamentos` SET `profissional_id` = NULL WHERE `profissional_id` = 0;');
    console.log('Registros com profissional_id = 0 normalizados para NULL.');

    console.log('Migração concluída com sucesso.');
  } catch (err) {
    console.error('Falha ao executar migração:', err && err.message ? err.message : err);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();