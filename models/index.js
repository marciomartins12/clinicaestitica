const { sequelize } = require('../config/database');

// Importar todos os modelos
const Usuario = require('./Usuario');
const Paciente = require('./Paciente');
const Agendamento = require('./Agendamento');
const Produto = require('./Produto');
const Clinica = require('./Clinica');
const FotoPaciente = require('./FotoPaciente');
const Exame = require('./Exame');
const Prescricao = require('./Prescricao');
const Pagamento = require('./Pagamento');
const Anamnese = require('./Anamnese');
const Atestado = require('./Atestado');
const ItemPrescricao = require('./ItemPrescricao');
const ItemCombo = require('./ItemCombo');
const ItemAgendamento = require('./ItemAgendamento');
const Recado = require('./Recado');

// Definir associações

// Associações do Usuario
Usuario.hasMany(Agendamento, { foreignKey: 'profissional_id', as: 'agendamentos_profissional' });
Usuario.hasMany(Prescricao, { foreignKey: 'profissional_id', as: 'prescricoes' });
Usuario.hasMany(Atestado, { foreignKey: 'profissional_id', as: 'atestados' });
Usuario.hasMany(Recado, { foreignKey: 'autor_id', as: 'recados_criados' });
Usuario.hasMany(Recado, { foreignKey: 'destinatario_id', as: 'recados_recebidos' });

// Associações do Paciente
Paciente.hasMany(Agendamento, { foreignKey: 'paciente_id', as: 'agendamentos' });
Paciente.hasMany(FotoPaciente, { foreignKey: 'paciente_id', as: 'fotos' });
Paciente.hasMany(Exame, { foreignKey: 'paciente_id', as: 'exames' });
Paciente.hasMany(Prescricao, { foreignKey: 'paciente_id', as: 'prescricoes' });
Paciente.hasMany(Pagamento, { foreignKey: 'paciente_id', as: 'pagamentos' });
Paciente.hasOne(Anamnese, { foreignKey: 'paciente_id', as: 'anamnese' });
Paciente.hasMany(Atestado, { foreignKey: 'paciente_id', as: 'atestados' });

// Associações do Agendamento
Agendamento.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });
Agendamento.belongsTo(Usuario, { foreignKey: 'profissional_id', as: 'profissional' });
Agendamento.belongsTo(Produto, { foreignKey: 'produto_id', as: 'produto' });
Agendamento.hasMany(FotoPaciente, { foreignKey: 'procedimento_id', as: 'fotos' });
Agendamento.hasMany(Pagamento, { foreignKey: 'agendamento_id', as: 'pagamentos' });
Agendamento.hasMany(ItemAgendamento, { foreignKey: 'agendamento_id', as: 'itens' });

// Associações do Produto
Produto.hasMany(Agendamento, { foreignKey: 'produto_id', as: 'agendamentos' });
Produto.hasMany(ItemPrescricao, { foreignKey: 'produto_id', as: 'itens_prescricao' });
Produto.hasMany(ItemCombo, { foreignKey: 'produto_id', as: 'itens_combo' });
Produto.hasMany(ItemCombo, { foreignKey: 'combo_produto_id', as: 'combos' });

// Associações do FotoPaciente
FotoPaciente.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });
FotoPaciente.belongsTo(Agendamento, { foreignKey: 'procedimento_id', as: 'procedimento' });

// Associações do Exame
Exame.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });

// Associações da Prescricao
Prescricao.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });
Prescricao.belongsTo(Usuario, { foreignKey: 'profissional_id', as: 'profissional' });
Prescricao.hasMany(ItemPrescricao, { foreignKey: 'prescricao_id', as: 'itens' });

// Associações do Pagamento
Pagamento.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });
Pagamento.belongsTo(Agendamento, { foreignKey: 'agendamento_id', as: 'agendamento' });

// Associações da Anamnese
Anamnese.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });

// Associações do Atestado
Atestado.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });
Atestado.belongsTo(Usuario, { foreignKey: 'profissional_id', as: 'profissional' });

// Associações do ItemPrescricao
ItemPrescricao.belongsTo(Prescricao, { foreignKey: 'prescricao_id', as: 'prescricao' });
ItemPrescricao.belongsTo(Produto, { foreignKey: 'produto_id', as: 'produto' });

// Associações do ItemCombo
ItemCombo.belongsTo(Produto, { foreignKey: 'produto_id', as: 'produto' });
ItemCombo.belongsTo(Produto, { foreignKey: 'combo_produto_id', as: 'combo_produto' });

// Associações do ItemAgendamento
ItemAgendamento.belongsTo(Agendamento, { foreignKey: 'agendamento_id', as: 'agendamento' });
ItemAgendamento.belongsTo(Produto, { foreignKey: 'produto_id', as: 'produto' });

// Associações do Recado
Recado.belongsTo(Usuario, { foreignKey: 'autor_id', as: 'autor' });
Recado.belongsTo(Usuario, { foreignKey: 'destinatario_id', as: 'destinatario' });

// Exportar todos os modelos
module.exports = {
    sequelize,
    Usuario,
    Paciente,
    Agendamento,
    Produto,
    Clinica,
    FotoPaciente,
    Exame,
    Prescricao,
    Pagamento,
    Anamnese,
    Atestado,
    ItemPrescricao,
    ItemCombo,
    ItemAgendamento,
    Recado
};