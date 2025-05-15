const assert = require('assert');
const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { Genre } = require('../models');
const { clearDatabase, createTestUser, createTestGenre } = require('./testUtils');

// Используем JWT_SECRET из .env
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Тесты для API жанров
 */
describe('Genre Tests', () => {
  let adminToken;
  let managerToken;
  let userToken;
  let testGenre;

  // Перед всеми тестами создаем тестовые данные
  before(async () => {
    await clearDatabase();

    // Создаем тестовых пользователей с разными ролями
    const admin = await createTestUser({ role: 'admin', email: 'admin-genre@test.com' });
    const manager = await createTestUser({ role: 'manager', email: 'manager-genre@test.com' });
    const user = await createTestUser({ role: 'user', email: 'user-genre@test.com' });

    // Создаем JWT токены
    adminToken = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: '1h' });
    managerToken = jwt.sign({ id: manager.id }, JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

    // Создаем тестовый жанр
    testGenre = await createTestGenre({ name: 'Тест жанр' });
  });

  /**
   * Тесты для получения всех жанров
   */
  describe('GET /api/v1/genres', () => {
    it('should get all genres', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/genres');

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert(Array.isArray(res.body.data.genres));
      assert(res.body.data.genres.length > 0);
      assert(res.body.data.genres.some(genre => genre.name === 'Тест жанр'));
    });
  });

  /**
   * Тесты для получения жанра по ID
   */
  describe('GET /api/v1/genres/:id', () => {
    it('should get a genre by id', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/genres/${testGenre.id}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.genre.name, 'Тест жанр');
    });

    it('should return 404 if genre not found', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/genres/9999');

      // Assert
      assert.strictEqual(res.status, 404);
    });
  });

  /**
   * Тесты для создания жанра
   */
  describe('POST /api/v1/genres', () => {
    it('should create a new genre as admin', async () => {
      // Arrange
      const genreName = 'Новый тестовый жанр';
      const genreData = { name: genreName };

      // Act
      const res = await request(app)
        .post('/api/v1/genres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(genreData);

      // Assert
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.genre.name, genreName);

      // Проверяем, что жанр действительно создан в базе
      const genre = await Genre.findOne({ where: { name: genreName } });
      assert(genre);
      assert.strictEqual(genre.name, genreName);
    });

    it('should create a new genre as manager', async () => {
      // Arrange
      const genreName = 'Жанр от менеджера';
      const genreData = { name: genreName };

      // Act
      const res = await request(app)
        .post('/api/v1/genres')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(genreData);

      // Assert
      assert.strictEqual(res.status, 201);
    });

    it('should not create a genre as user', async () => {
      // Arrange
      const genreData = { name: 'Жанр от пользователя' };

      // Act
      const res = await request(app)
        .post('/api/v1/genres')
        .set('Authorization', `Bearer ${userToken}`)
        .send(genreData);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not create a genre without authentication', async () => {
      // Arrange
      const genreData = { name: 'Неавторизованный жанр' };

      // Act
      const res = await request(app)
        .post('/api/v1/genres')
        .send(genreData);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should not create a genre with existing name', async () => {
      // Arrange
      const genreData = { name: 'Тест жанр' };

      // Act
      const res = await request(app)
        .post('/api/v1/genres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(genreData);

      // Assert
      assert.strictEqual(res.status, 400);
    });

    it('should not create a genre with empty name', async () => {
      // Arrange
      const genreData = { name: '' };

      // Act
      const res = await request(app)
        .post('/api/v1/genres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(genreData);

      // Assert
      assert.strictEqual(res.status, 400);
    });
  });

  /**
   * Тесты для обновления жанра
   */
  describe('PUT /api/v1/genres/:id', () => {
    it('should update a genre as admin', async () => {
      // Arrange
      const genre = await createTestGenre({ name: 'Жанр для обновления' });
      const updateData = { name: 'Обновленный жанр' };

      // Act
      const res = await request(app)
        .put(`/api/v1/genres/${genre.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.genre.name, 'Обновленный жанр');

      // Проверяем, что жанр действительно обновлен в базе
      const updatedGenre = await Genre.findByPk(genre.id);
      assert.strictEqual(updatedGenre.name, 'Обновленный жанр');
    });

    it('should update a genre as manager', async () => {
      // Arrange
      const genre = await createTestGenre({ name: 'Жанр для менеджера' });
      const updateData = { name: 'Менеджер обновил жанр' };

      // Act
      const res = await request(app)
        .put(`/api/v1/genres/${genre.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 200);
    });

    it('should not update a genre as user', async () => {
      // Arrange
      const updateData = { name: 'Пользователь обновил жанр' };

      // Act
      const res = await request(app)
        .put(`/api/v1/genres/${testGenre.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not update a genre without authentication', async () => {
      // Arrange
      const updateData = { name: 'Неавторизованное обновление жанра' };

      // Act
      const res = await request(app)
        .put(`/api/v1/genres/${testGenre.id}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should not update to an existing genre name', async () => {
      // Arrange
      const genre1 = await createTestGenre({ name: 'Уникальный жанр 1' });
      const genre2 = await createTestGenre({ name: 'Уникальный жанр 2' });
      const updateData = { name: 'Уникальный жанр 1' };

      // Act
      const res = await request(app)
        .put(`/api/v1/genres/${genre2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 400);
    });

    it('should return 404 if genre not found', async () => {
      // Arrange
      const updateData = { name: 'Несуществующий жанр' };

      // Act
      const res = await request(app)
        .put('/api/v1/genres/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 404);
    });
  });

  /**
   * Тесты для удаления жанра
   */
  describe('DELETE /api/v1/genres/:id', () => {
    it('should delete a genre as admin', async () => {
      // Arrange
      const genre = await createTestGenre({ name: 'Жанр для удаления' });

      // Act
      const res = await request(app)
        .delete(`/api/v1/genres/${genre.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');

      // Проверяем, что жанр действительно удален из базы
      const deletedGenre = await Genre.findByPk(genre.id);
      assert.strictEqual(deletedGenre, null);
    });

    it('should delete a genre as manager', async () => {
      // Arrange
      const genre = await createTestGenre({ name: 'Жанр менеджера' });

      // Act
      const res = await request(app)
        .delete(`/api/v1/genres/${genre.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');

      // Проверяем, что жанр действительно удален из базы
      const deletedGenre = await Genre.findByPk(genre.id);
      assert.strictEqual(deletedGenre, null);
    });

    it('should not delete a genre as user', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/genres/${testGenre.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not delete a genre without authentication', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/genres/${testGenre.id}`);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 if genre not found', async () => {
      // Act
      const res = await request(app)
        .delete('/api/v1/genres/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 404);
    });
  });
}); 