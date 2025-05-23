const assert = require('assert');
const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { Artwork } = require('../models');
const { clearDatabase, createTestUser, createTestAuthor, createTestStyle, createTestGenre, createTestExhibition, createTestArtwork } = require('./testUtils');

// Используем JWT_SECRET из .env
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Тесты для API произведений искусства
 */
describe('Artwork Tests', () => {
  let adminToken;
  let adminUser;
  let author;
  let style;
  let genre;
  let exhibition;
  let testArtwork;

  // Перед всеми тестами создаем необходимые зависимости
  before(async () => {
    // Очищаем базу данных
    await clearDatabase();

    // Создаем администратора для получения токена
    adminUser = await createTestUser({ role: 'admin' });
    adminToken = jwt.sign({ id: adminUser.id }, JWT_SECRET, { expiresIn: '1h' });

    // Создаем необходимые зависимости для тестов
    author = await createTestAuthor();
    style = await createTestStyle();
    genre = await createTestGenre();
    exhibition = await createTestExhibition();
  });

  // Перед каждым тестом создаем тестовый экземпляр artwork
  beforeEach(async () => {
    testArtwork = await createTestArtwork({
      author_id: author.id,
      style_id: style.id,
      genre_id: genre.id,
      exhibition_id: exhibition.id
    });
  });

  // После каждого теста удаляем тестовый экземпляр artwork
  afterEach(async () => {
    await Artwork.destroy({ where: {} });
  });

  /**
   * Тесты для получения всех произведений искусства (getAllArtworks)
   */
  describe('GET /api/v1/artworks', () => {
    it('should get all artworks', async () => {
      // Arrange
      // Создаем дополнительные артворки для проверки пагинации
      await createTestArtwork({ author_id: author.id, style_id: style.id, genre_id: genre.id });
      await createTestArtwork({ author_id: author.id, style_id: style.id, genre_id: genre.id });

      // Act
      const res = await request(app)
        .get('/api/v1/artworks');

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.ok(res.body.data.artworks);
      assert.ok(res.body.data.artworks.length >= 3);
      assert.ok(res.body.data.pagination);
    });

    it('should filter artworks by author_id', async () => {
      // Arrange
      const newAuthor = await createTestAuthor({ surname: 'Другой', first_name: 'Автор' });
      await createTestArtwork({ author_id: newAuthor.id, style_id: style.id, genre_id: genre.id });

      // Act
      const res = await request(app)
        .get(`/api/v1/artworks?author_id=${author.id}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.ok(res.body.data.artworks);
      
      // Проверяем, что все произведения имеют правильный author_id
      for (const artwork of res.body.data.artworks) {
        assert.strictEqual(artwork.author_id, author.id);
      }
    });

    it('should filter artworks by style_id', async () => {
      // Arrange
      const newStyle = await createTestStyle({ name: 'Новый стиль' });
      await createTestArtwork({ author_id: author.id, style_id: newStyle.id, genre_id: genre.id });

      // Act
      const res = await request(app)
        .get(`/api/v1/artworks?style_id=${style.id}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      
      // Проверяем, что все произведения имеют правильный style_id
      for (const artwork of res.body.data.artworks) {
        assert.strictEqual(artwork.style_id, style.id);
      }
    });

    it('should filter artworks by genre_id', async () => {
      // Arrange
      const newGenre = await createTestGenre({ name: 'Новый жанр' });
      await createTestArtwork({ author_id: author.id, style_id: style.id, genre_id: newGenre.id });

      // Act
      const res = await request(app)
        .get(`/api/v1/artworks?genre_id=${genre.id}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      
      // Проверяем, что все произведения имеют правильный genre_id
      for (const artwork of res.body.data.artworks) {
        assert.strictEqual(artwork.genre_id, genre.id);
      }
    });

    it('should filter artworks by exhibition_id', async () => {
      // Arrange
      const newExhibition = await createTestExhibition({ title: 'Новая выставка' });
      await createTestArtwork({ 
        author_id: author.id, 
        style_id: style.id, 
        genre_id: genre.id,
        exhibition_id: newExhibition.id
      });

      // Act
      const res = await request(app)
        .get(`/api/v1/artworks?exhibition_id=${exhibition.id}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      
      // Проверяем, что все произведения имеют правильный exhibition_id
      for (const artwork of res.body.data.artworks) {
        assert.strictEqual(artwork.exhibition_id, exhibition.id);
      }
    });
  });

  /**
   * Тесты для получения произведения искусства по ID (getArtwork)
   */
  describe('GET /api/v1/artworks/:id', () => {
    it('should get artwork by id', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/artworks/${testArtwork.id}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.artwork.id, testArtwork.id);
      assert.strictEqual(res.body.data.artwork.title, testArtwork.title);
    });

    it('should return 404 for non-existent artwork', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/artworks/9999');

      // Assert
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.status, 'error');
    });
  });

  /**
   * Тесты для создания произведения искусства (createArtwork)
   */
  describe('POST /api/v1/artworks', () => {
    it('should create a new artwork when authenticated as admin', async () => {
      // Arrange
      const newArtworkData = {
        title: 'Новое произведение',
        width: 120.5,
        height: 90.0,
        author_id: author.id,
        creation_year: 2010,
        style_id: style.id,
        genre_id: genre.id,
        description: 'Тестовое описание нового произведения',
        image_path: '/images/new_artwork.jpg',
        exhibition_id: exhibition.id
      };

      // Act
      const res = await request(app)
        .post('/api/v1/artworks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newArtworkData);

      // Assert
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.artwork.title, newArtworkData.title);
      assert.strictEqual(parseFloat(res.body.data.artwork.width), newArtworkData.width);
      assert.strictEqual(parseFloat(res.body.data.artwork.height), newArtworkData.height);
      assert.strictEqual(res.body.data.artwork.author_id, newArtworkData.author_id);
      assert.strictEqual(res.body.data.artwork.creation_year, newArtworkData.creation_year);
      
      // Проверяем, что произведение добавлено в базу данных
      const createdArtwork = await Artwork.findByPk(res.body.data.artwork.id);
      assert.ok(createdArtwork);
    });

    it('should not create artwork without authentication', async () => {
      // Arrange
      const newArtworkData = {
        title: 'Еще одно произведение',
        width: 80.0,
        height: 60.0,
        author_id: author.id,
        style_id: style.id,
        genre_id: genre.id,
        image_path: '/images/another_artwork.jpg'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/artworks')
        .send(newArtworkData);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        width: 80.0,
        height: 60.0
      };

      // Act
      const res = await request(app)
        .post('/api/v1/artworks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      // Assert
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.status, 'error');
      assert.ok(res.body.errors);
    });
  });

  /**
   * Тесты для обновления произведения искусства (updateArtwork)
   */
  describe('PUT /api/v1/artworks/:id', () => {
    it('should update artwork when authenticated as admin', async () => {
      // Arrange
      const updateData = {
        title: 'Обновленное название',
        width: 150.0,
        height: 120.0,
        description: 'Обновленное описание'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/artworks/${testArtwork.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.artwork.title, updateData.title);
      assert.strictEqual(parseFloat(res.body.data.artwork.width), updateData.width);
      assert.strictEqual(parseFloat(res.body.data.artwork.height), updateData.height);
      assert.strictEqual(res.body.data.artwork.description, updateData.description);
      
      // Проверяем, что произведение обновлено в базе данных
      const updatedArtwork = await Artwork.findByPk(testArtwork.id);
      assert.strictEqual(updatedArtwork.title, updateData.title);
    });

    it('should not update artwork without authentication', async () => {
      // Arrange
      const updateData = {
        title: 'Новое название без авторизации'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/artworks/${testArtwork.id}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 for non-existent artwork', async () => {
      // Act
      const res = await request(app)
        .put('/api/v1/artworks/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Несуществующее произведение' });

      // Assert
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.status, 'error');
    });
  });

  /**
   * Тесты для удаления произведения искусства (deleteArtwork)
   */
  describe('DELETE /api/v1/artworks/:id', () => {
    it('should delete artwork when authenticated as admin', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/artworks/${testArtwork.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      
      // Проверяем, что произведение удалено из базы данных
      const deletedArtwork = await Artwork.findByPk(testArtwork.id);
      assert.strictEqual(deletedArtwork, null);
    });

    it('should not delete artwork without authentication', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/artworks/${testArtwork.id}`);

      // Assert
      assert.strictEqual(res.status, 401);
      
      // Проверяем, что произведение не удалено из базы данных
      const artwork = await Artwork.findByPk(testArtwork.id);
      assert.ok(artwork);
    });

    it('should return 404 for non-existent artwork', async () => {
      // Act
      const res = await request(app)
        .delete('/api/v1/artworks/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.status, 'error');
    });
  });
}); 