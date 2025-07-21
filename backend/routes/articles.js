const express = require('express');
const { Article, User, Project } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get all articles with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status = 'Published',
      isFeatured,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (category) {
      whereClause.category = category;
    }
    if (status) {
      whereClause.status = status;
    }
    if (isFeatured !== undefined) {
      whereClause.isFeatured = isFeatured === 'true';
    }
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const articles = await Article.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'authorUser',
          attributes: ['id', 'name', 'username']
        },
        {
          model: Project,
          as: 'relatedProject',
          attributes: ['id', 'name', 'projectCode']
        }
      ],
      order: [['publishDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      articles: articles.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(articles.count / limit),
        totalItems: articles.count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles'
    });
  }
});

// Get a single article by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'authorUser',
          attributes: ['id', 'name', 'username']
        },
        {
          model: Project,
          as: 'relatedProject',
          attributes: ['id', 'name', 'projectCode', 'description']
        }
      ]
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    // Increment view count
    await article.increment('viewCount');

    res.json({
      success: true,
      article
    });

  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article'
    });
  }
});

// Create a new article (admin only)
router.post('/', async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      author,
      publishDate,
      imageUrl,
      category,
      tags,
      isFeatured,
      externalUrl,
      projectId,
      authorId
    } = req.body;

    const article = await Article.create({
      title,
      summary,
      content,
      author: author || 'LGU Communications Office',
      publishDate: publishDate || new Date(),
      imageUrl,
      category: category || 'News',
      tags: tags || [],
      isFeatured: isFeatured || false,
      externalUrl,
      projectId,
      authorId,
      status: 'Published'
    });

    res.status(201).json({
      success: true,
      article
    });

  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create article'
    });
  }
});

// Update an article (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    await article.update(updateData);

    res.json({
      success: true,
      article
    });

  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article'
    });
  }
});

// Delete an article (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    await article.destroy();

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete article'
    });
  }
});

// Get featured articles for home page
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 4 } = req.query;

    const featuredArticles = await Article.findAll({
      where: {
        status: 'Published',
        isFeatured: true
      },
      include: [
        {
          model: User,
          as: 'authorUser',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['publishDate', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      articles: featuredArticles
    });

  } catch (error) {
    console.error('Error fetching featured articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured articles'
    });
  }
});

// Get articles by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const articles = await Article.findAndCountAll({
      where: {
        category,
        status: 'Published'
      },
      include: [
        {
          model: User,
          as: 'authorUser',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['publishDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      articles: articles.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(articles.count / limit),
        totalItems: articles.count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching articles by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles by category'
    });
  }
});

module.exports = router; 