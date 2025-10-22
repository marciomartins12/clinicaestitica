const { Produto } = require('../models');
const { Op } = require('sequelize');

class ProdutoController {
    // Buscar produtos com filtros
    static async buscarProdutos(req, res) {
        try {
            const { categoria, tipo, busca, page = 1, limit = 50 } = req.query;
            
            let whereClause = {
                status: 'ativo'
            };
            
            // Filtro por categoria (aceita alias 'tipo' para compatibilidade)
            const categoriaParam = categoria || tipo;
            if (categoriaParam) {
                whereClause.categoria = categoriaParam;
            }
            
            // Filtro por busca (nome ou descrição)
            if (busca) {
                whereClause[Op.or] = [
                    { nome: { [Op.like]: `%${busca}%` } },
                    { descricao: { [Op.like]: `%${busca}%` } }
                ];
            }
            
            const offset = (page - 1) * limit;
            
            const { count, rows: produtos } = await Produto.findAndCountAll({
                where: whereClause,
                order: [['nome', 'ASC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
            res.json({
                success: true,
                data: produtos,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar produtos'
            });
        }
    }
    
    // Buscar produto por ID
    static async buscarProdutoPorId(req, res) {
        try {
            const { id } = req.params;
            
            const produto = await Produto.findByPk(id);
            
            if (!produto) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado'
                });
            }
            
            res.json({
                success: true,
                data: produto
            });
            
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar produto'
            });
        }
    }
    
    // Criar novo produto
    static async criarProduto(req, res) {
        try {
            const {
                nome,
                descricao,
                categoria,
                tipo,
                preco,
                duracao_minutos,
                codigo,
                marca,
                fornecedor,
                estoque_atual,
                estoque_minimo,
                unidade_medida,
                data_validade,
                lote,
                observacoes
            } = req.body;
            
            // Resolver categoria (aceita alias 'tipo')
            const categoriaResolved = categoria || tipo;
            
            // Validações básicas
            if (!nome || !categoriaResolved || !preco) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome, categoria e preço são obrigatórios'
                });
            }
            
            // Verificar se código já existe (se fornecido)
            if (codigo) {
                const produtoExistente = await Produto.findOne({
                    where: { codigo }
                });
                
                if (produtoExistente) {
                    return res.status(400).json({
                        success: false,
                        message: 'Código já existe'
                    });
                }
            }
            
            const novoProduto = await Produto.create({
                nome,
                descricao,
                categoria: categoriaResolved,
                preco,
                duracao_minutos,
                codigo,
                marca,
                fornecedor,
                estoque_atual,
                estoque_minimo,
                unidade_medida,
                data_validade,
                lote,
                observacoes,
                status: 'ativo'
            });
            
            res.status(201).json({
                success: true,
                message: 'Produto criado com sucesso',
                data: novoProduto
            });
            
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            
            // Tratar erro de validação do Sequelize
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors.map(err => err.message)
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Erro ao criar produto'
            });
        }
    }
    
    // Atualizar produto
    static async atualizarProduto(req, res) {
        try {
            const { id } = req.params;
            const {
                nome,
                descricao,
                categoria,
                tipo,
                preco,
                duracao_minutos,
                codigo,
                marca,
                fornecedor,
                estoque_atual,
                estoque_minimo,
                unidade_medida,
                data_validade,
                lote,
                observacoes,
                status
            } = req.body;
            
            const produto = await Produto.findByPk(id);
            
            if (!produto) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado'
                });
            }
            
            // Verificar se código já existe (se fornecido e diferente do atual)
            if (codigo && codigo !== produto.codigo) {
                const produtoExistente = await Produto.findOne({
                    where: { 
                        codigo,
                        id: { [Op.ne]: id }
                    }
                });
                
                if (produtoExistente) {
                    return res.status(400).json({
                        success: false,
                        message: 'Código já existe'
                    });
                }
            }
            
            // Resolver categoria (aceita alias 'tipo')
            const categoriaResolved = categoria || tipo;
            
            await produto.update({
                nome,
                descricao,
                categoria: categoriaResolved ?? produto.categoria,
                preco,
                duracao_minutos,
                codigo,
                marca,
                fornecedor,
                estoque_atual,
                estoque_minimo,
                unidade_medida,
                data_validade,
                lote,
                observacoes,
                status
            });
            
            res.json({
                success: true,
                message: 'Produto atualizado com sucesso',
                data: produto
            });
            
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            
            // Tratar erro de validação do Sequelize
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors.map(err => err.message)
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar produto'
            });
        }
    }
    
    // Excluir produto (soft delete)
    static async excluirProduto(req, res) {
        try {
            const { id } = req.params;
            
            const produto = await Produto.findByPk(id);
            
            if (!produto) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado'
                });
            }
            
            // Soft delete - apenas marcar como inativo
            await produto.update({ status: 'inativo' });
            
            res.json({
                success: true,
                message: 'Produto excluído com sucesso'
            });
            
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao excluir produto'
            });
        }
    }
}

module.exports = ProdutoController;