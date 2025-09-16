const { Anamnese, Atestado, Exame, FotoPaciente, Prescricao, Paciente, Clinica } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

class AtendimentoController {
    // Salvar anamnese
    static async salvarAnamnese(req, res) {
        try {
            const { paciente_id, queixa_principal, historia_doenca, antecedentes_pessoais, medicamentos_uso, exame_fisico } = req.body;
            
            // Verificar se já existe anamnese para este paciente
            let anamnese = await Anamnese.findOne({ where: { paciente_id } });
            
            if (anamnese) {
                // Atualizar anamnese existente
                await anamnese.update({
                    queixa_principal,
                    historia_doenca,
                    antecedentes_pessoais,
                    medicamentos_uso,
                    exame_fisico
                });
            } else {
                // Criar nova anamnese
                anamnese = await Anamnese.create({
                    paciente_id,
                    queixa_principal,
                    historia_doenca,
                    antecedentes_pessoais,
                    medicamentos_uso,
                    exame_fisico
                });
            }
            
            res.json({ success: true, data: anamnese });
        } catch (error) {
            console.error('Erro ao salvar anamnese:', error);
            res.status(500).json({ success: false, message: 'Erro ao salvar anamnese' });
        }
    }
    
    // Buscar anamnese do paciente
    static async buscarAnamnese(req, res) {
        try {
            const { pacienteId } = req.params;
            
            const anamnese = await Anamnese.findOne({ where: { paciente_id: pacienteId } });
            
            res.json({ success: true, data: anamnese });
        } catch (error) {
            console.error('Erro ao buscar anamnese:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar anamnese' });
        }
    }
    
    // Salvar atestado
    static async salvarAtestado(req, res) {
        try {
            const { paciente_id, conteudo, tipo } = req.body;
            
            const atestado = await Atestado.create({
                paciente_id,
                conteudo,
                tipo: tipo || 'medico',
                data_emissao: new Date()
            });
            
            res.json({ success: true, data: atestado });
        } catch (error) {
            console.error('Erro ao salvar atestado:', error);
            res.status(500).json({ success: false, message: 'Erro ao salvar atestado' });
        }
    }
    
    // Buscar atestados do paciente
    static async buscarAtestados(req, res) {
        try {
            const { pacienteId } = req.params;
            
            const atestados = await Atestado.findAll({
                where: { paciente_id: pacienteId },
                order: [['data_emissao', 'DESC']]
            });
            
            res.json({ success: true, data: atestados });
        } catch (error) {
            console.error('Erro ao buscar atestados:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar atestados' });
        }
    }
    
    // Salvar exame
    static async salvarExame(req, res) {
        try {
            const { paciente_id, tipo_exame, data_exame, laboratorio, medico_solicitante, observacoes, status } = req.body;
            
            const exame = await Exame.create({
                paciente_id,
                tipo_exame,
                data_exame,
                laboratorio,
                medico_solicitante,
                observacoes,
                status: status || 'solicitado'
            });
            
            res.json({ success: true, data: exame });
        } catch (error) {
            console.error('Erro ao salvar exame:', error);
            res.status(500).json({ success: false, message: 'Erro ao salvar exame' });
        }
    }
    
    // Atualizar status do exame
    static async atualizarStatusExame(req, res) {
        try {
            const { exame_id, status } = req.body;
            
            const exame = await Exame.findByPk(exame_id);
            if (!exame) {
                return res.status(404).json({ success: false, message: 'Exame não encontrado' });
            }
            
            await exame.update({ status });
            
            res.json({ success: true, data: exame });
        } catch (error) {
            console.error('Erro ao atualizar status do exame:', error);
            res.status(500).json({ success: false, message: 'Erro ao atualizar status do exame' });
        }
    }
    
    // Salvar resultados do exame
    static async salvarResultadosExame(req, res) {
        try {
            const { exame_id, resultados_json, observacoes, status } = req.body;
            
            const exame = await Exame.findByPk(exame_id);
            if (!exame) {
                return res.status(404).json({ success: false, message: 'Exame não encontrado' });
            }
            
            await exame.update({
                resultados_json,
                observacoes,
                status: status || 'concluido'
            });
            
            res.json({ success: true, data: exame });
        } catch (error) {
            console.error('Erro ao salvar resultados do exame:', error);
            res.status(500).json({ success: false, message: 'Erro ao salvar resultados do exame' });
        }
    }
    
    // Buscar exames do paciente
    static async buscarExames(req, res) {
        try {
            const { pacienteId } = req.params;
            
            const exames = await Exame.findAll({
                where: { paciente_id: pacienteId },
                order: [['data_exame', 'DESC']]
            });
            
            res.json({ success: true, data: exames });
        } catch (error) {
            console.error('Erro ao buscar exames:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar exames' });
        }
    }
    
    // Salvar foto
    static async salvarFoto(req, res) {
        try {
            const { paciente_id, titulo, descricao, procedimento, momento, imagem_base64 } = req.body;
            
            // Criar diretório se não existir
            const uploadDir = path.join(__dirname, '../public/uploads/fotos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Gerar nome único para o arquivo
            const fileName = `foto_${paciente_id}_${Date.now()}.jpg`;
            const filePath = path.join(uploadDir, fileName);
            
            // Converter base64 para arquivo
            const base64Data = imagem_base64.replace(/^data:image\/jpeg;base64,/, '');
            fs.writeFileSync(filePath, base64Data, 'base64');
            
            // Salvar no banco
            const foto = await FotoPaciente.create({
                paciente_id,
                titulo,
                descricao,
                procedimento,
                momento,
                caminho_arquivo: `/uploads/fotos/${fileName}`,
                data_foto: new Date()
            });
            
            res.json({ success: true, data: foto });
        } catch (error) {
            console.error('Erro ao salvar foto:', error);
            res.status(500).json({ success: false, message: 'Erro ao salvar foto' });
        }
    }
    
    // Buscar fotos do paciente
    static async buscarFotos(req, res) {
        try {
            const { pacienteId } = req.params;
            
            const fotos = await FotoPaciente.findAll({
                where: { paciente_id: pacienteId },
                order: [['data_foto', 'DESC']]
            });
            
            res.json({ success: true, data: fotos });
        } catch (error) {
            console.error('Erro ao buscar fotos:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar fotos' });
        }
    }
    
    // Salvar prescrição
    static async salvarPrescricao(req, res) {
        try {
            const { paciente_id, conteudo, medicamentos } = req.body;
            
            const prescricao = await Prescricao.create({
                paciente_id,
                conteudo,
                medicamentos: JSON.stringify(medicamentos),
                data_prescricao: new Date()
            });
            
            res.json({ success: true, data: prescricao });
        } catch (error) {
            console.error('Erro ao salvar prescrição:', error);
            res.status(500).json({ success: false, message: 'Erro ao salvar prescrição' });
        }
    }
    
    // Buscar prescrições do paciente
    static async buscarPrescricoes(req, res) {
        try {
            const { pacienteId } = req.params;
            
            const prescricoes = await Prescricao.findAll({
                where: { paciente_id: pacienteId },
                order: [['data_prescricao', 'DESC']]
            });
            
            res.json({ success: true, data: prescricoes });
        } catch (error) {
            console.error('Erro ao buscar prescrições:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar prescrições' });
        }
    }
    
    // Buscar histórico completo do paciente
    static async buscarHistorico(req, res) {
        try {
            const { pacienteId } = req.params;
            const { dataInicio, dataFim } = req.query;
            
            let whereClause = { paciente_id: pacienteId };
            
            if (dataInicio && dataFim) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(dataInicio), new Date(dataFim)]
                };
            }
            
            // Buscar todos os tipos de registros
            const [anamneses, atestados, exames, fotos, prescricoes] = await Promise.all([
                Anamnese.findAll({ where: whereClause, order: [['createdAt', 'DESC']] }),
                Atestado.findAll({ where: whereClause, order: [['data_emissao', 'DESC']] }),
                Exame.findAll({ where: whereClause, order: [['data_exame', 'DESC']] }),
                FotoPaciente.findAll({ where: whereClause, order: [['data_foto', 'DESC']] }),
                Prescricao.findAll({ where: whereClause, order: [['data_prescricao', 'DESC']] })
            ]);
            
            // Organizar por tipo
            const historico = {
                anamneses,
                atestados,
                exames,
                fotos,
                prescricoes
            };
            
            res.json({ success: true, data: historico });
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar histórico' });
        }
    }
    
    // Buscar medicamentos cadastrados
    static async buscarMedicamentos(req, res) {
        try {
            const { Produto } = require('../models');
            
            const medicamentos = await Produto.findAll({
                where: {
                    tipo: 'medicamento',
                    status: 'ativo'
                },
                order: [['nome', 'ASC']]
            });
            
            res.json({ success: true, data: medicamentos });
        } catch (error) {
            console.error('Erro ao buscar medicamentos:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar medicamentos' });
        }
    }
    
    // Finalizar atendimento
    static async finalizarAtendimento(req, res) {
        try {
            const { pacienteId } = req.params;
            const { observacoes } = req.body;
            
            // Aqui você pode implementar a lógica para finalizar o atendimento
            // Por exemplo, criar um registro de atendimento, atualizar status, etc.
            
            res.json({ success: true, message: 'Atendimento finalizado com sucesso' });
        } catch (error) {
            console.error('Erro ao finalizar atendimento:', error);
            res.status(500).json({ success: false, message: 'Erro ao finalizar atendimento' });
        }
    }
}

module.exports = AtendimentoController;