const { Anamnese, Atestado, Exame, FotoPaciente, Prescricao, Paciente, Clinica, ItemExame, Agendamento, Produto } = require('../models');
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
            const { paciente_id, tipo_exame, data_exame, laboratorio, observacoes, status } = req.body;
            const solicitanteNome = (req.session && req.session.user && req.session.user.nome) ? req.session.user.nome : null;
            
            const exame = await Exame.create({
                paciente_id,
                tipo_exame,
                data_exame,
                laboratorio,
                medico_solicitante: solicitanteNome,
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
            const { exame_id, resultados, observacoes, status } = req.body;
            
            const exame = await Exame.findByPk(exame_id);
            if (!exame) {
                return res.status(404).json({ success: false, message: 'Exame não encontrado' });
            }
            
            // Remover resultados existentes
            await ItemExame.destroy({ where: { exame_id } });
            
            // Adicionar novos resultados
            if (resultados && Array.isArray(resultados) && resultados.length > 0) {
                for (const resultado of resultados) {
                    if (resultado.chave && resultado.valor) {
                        await ItemExame.create({
                            exame_id,
                            chave: resultado.chave,
                            valor: resultado.valor,
                            unidade: resultado.unidade || null,
                            valor_referencia: resultado.valor_referencia || null,
                            observacoes: resultado.observacoes || null
                        });
                    }
                }
            }
            
            // Atualizar exame
            await exame.update({
                observacoes,
                status: status || 'concluido'
            });
            
            // Buscar exame com resultados
            const exameAtualizado = await Exame.findByPk(exame_id, {
                include: [{
                    model: ItemExame,
                    as: 'resultados'
                }]
            });
            
            res.json({ success: true, data: exameAtualizado });
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
                include: [{
                    model: ItemExame,
                    as: 'resultados',
                    required: false
                }],
                order: [['data_exame', 'DESC']]
            });
            
            res.json({ success: true, data: exames });
        } catch (error) {
            console.error('Erro ao buscar exames:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar exames' });
        }
    }
    
    // Apagar exame
    static async apagarExame(req, res) {
        try {
            const { exameId } = req.params;
            
            const exame = await Exame.findByPk(exameId);
            if (!exame) {
                return res.status(404).json({ success: false, message: 'Exame não encontrado' });
            }
            
            // Os resultados serão apagados automaticamente devido ao CASCADE
            await exame.destroy();
            
            res.json({ success: true, message: 'Exame apagado com sucesso' });
        } catch (error) {
            console.error('Erro ao apagar exame:', error);
            res.status(500).json({ success: false, message: 'Erro ao apagar exame' });
        }
    }
    
    // Salvar foto
    static async salvarFoto(req, res) {
        try {
            const { paciente_id, titulo, descricao, procedimento_id, momento_procedimento, imagem_base64 } = req.body;
            
            console.log('Salvando foto:', { paciente_id, titulo, procedimento_id, momento_procedimento });
            
            // Validar dados obrigatórios
            if (!paciente_id || !titulo || !momento_procedimento || !imagem_base64) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Dados obrigatórios não fornecidos' 
                });
            }
            
            // Extrair tipo de arquivo da string base64
            let tipoArquivo = 'jpg';
            let base64Data = imagem_base64;
            
            if (imagem_base64.startsWith('data:image/')) {
                const matches = imagem_base64.match(/data:image\/(\w+);base64,(.*)/);
                if (matches) {
                    tipoArquivo = matches[1];
                    base64Data = matches[2];
                }
            }
            
            // Converter base64 para buffer
            const fotoBuffer = Buffer.from(base64Data, 'base64');
            const tamanhoArquivo = fotoBuffer.length;
            
            console.log('Dados da foto:', { tipoArquivo, tamanhoArquivo });
            
            // Salvar no banco como BLOB
            const fotoData = {
                paciente_id,
                titulo,
                descricao,
                momento_procedimento,
                foto: fotoBuffer,
                tipo_arquivo: tipoArquivo,
                tamanho_arquivo: tamanhoArquivo,
                data_foto: new Date()
            };
            if (procedimento_id) {
                fotoData.procedimento_id = procedimento_id;
            }
            const foto = await FotoPaciente.create(fotoData);
            
            console.log('Foto salva com sucesso:', foto.id);
            
            // Retornar dados sem o BLOB para economizar bandwidth
            const fotoResponse = {
                id: foto.id,
                paciente_id: foto.paciente_id,
                procedimento_id: foto.procedimento_id,
                titulo: foto.titulo,
                descricao: foto.descricao,
                momento_procedimento: foto.momento_procedimento,
                tipo_arquivo: foto.tipo_arquivo,
                tamanho_arquivo: foto.tamanho_arquivo,
                data_foto: foto.data_foto
            };
            
            res.json({ success: true, data: fotoResponse });
        } catch (error) {
            console.error('Erro ao salvar foto:', error);
            // Erro de coluna inexistente (banco desatualizado)
            const msg = typeof error?.message === 'string' ? error.message : '';
            if (msg.includes("Unknown column 'procedimento_id'")) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Banco de dados desatualizado: coluna procedimento_id ausente em fotos_pacientes' 
                });
            }
            res.status(500).json({ success: false, message: 'Erro ao salvar foto' });
        }
    }
    
    // Buscar fotos do paciente
    static async buscarFotos(req, res) {
        try {
            const { pacienteId } = req.params;
            
            const fotos = await FotoPaciente.findAll({
                where: { paciente_id: pacienteId },
                include: [
                    {
                        model: Agendamento,
                        as: 'procedimento',
                        include: [
                            {
                                model: Produto,
                                as: 'produto'
                            }
                        ],
                        required: false
                    }
                ],
                order: [['data_foto', 'DESC']]
            });
            
            // Converter BLOBs para base64
            const fotosComBase64 = fotos.map(foto => {
                const fotoData = {
                    id: foto.id,
                    paciente_id: foto.paciente_id,
                    procedimento_id: foto.procedimento_id,
                    titulo: foto.titulo,
                    descricao: foto.descricao,
                    momento_procedimento: foto.momento_procedimento,
                    tipo_arquivo: foto.tipo_arquivo,
                    tamanho_arquivo: foto.tamanho_arquivo,
                    data_foto: foto.data_foto,
                    criado_em: foto.criado_em,
                    atualizado_em: foto.atualizado_em
                };
                
                // Incluir informações do procedimento se existir
                if (foto.procedimento) {
                    fotoData.procedimento = {
                        id: foto.procedimento.id,
                        data_agendamento: foto.procedimento.data_agendamento,
                        status: foto.procedimento.status,
                        produto: foto.procedimento.produto ? {
                            id: foto.procedimento.produto.id,
                            nome: foto.procedimento.produto.nome,
                            categoria: foto.procedimento.produto.categoria
                        } : null
                    };
                }
                
                // Converter BLOB para base64
                if (foto.foto) {
                    const base64 = foto.foto.toString('base64');
                    fotoData.imagem_base64 = `data:image/${foto.tipo_arquivo};base64,${base64}`;
                }
                
                return fotoData;
            });
            
            res.json({ success: true, data: fotosComBase64 });
        } catch (error) {
            console.error('Erro ao buscar fotos:', error);
            res.status(500).json({ success: false, message: 'Erro ao buscar fotos' });
        }
    }
    
    // Excluir foto
    static async excluirFoto(req, res) {
        try {
            const { fotoId } = req.params;
            
            console.log('Excluindo foto:', fotoId);
            
            // Buscar a foto para verificar se existe
            const foto = await FotoPaciente.findByPk(fotoId);
            
            if (!foto) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Foto não encontrada' 
                });
            }
            
            // Excluir a foto
            await foto.destroy();
            
            console.log('Foto excluída com sucesso:', fotoId);
            
            res.json({ success: true, message: 'Foto excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir foto:', error);
            res.status(500).json({ success: false, message: 'Erro ao excluir foto' });
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
                    categoria: 'medicamento',
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