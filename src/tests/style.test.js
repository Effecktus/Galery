const assert = require('assert');
const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { Style } = require('../models');
const { clearDatabase, createTestUser, createTestStyle } = require('./testUtils');

// Используем JWT_SECRET из .env
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

describe('Style Tests', () => {
  let adminToken;
  let managerToken;
  let userToken;
  let testStyle;

  // Перед всеми тестами создаем тестовые данные
  before(async () => {
    await clearDatabase();

    // Создаем тестовых пользователей с разными ролями
    const admin = await createTestUser({ role: 'admin', email: 'admin-style@test.com' });
    const manager = await createTestUser({ role: 'manager', email: 'manager-style@test.com' });
    const user = await createTestUser({ role: 'user', email: 'user-style@test.com' });

    // Создаем JWT токены
    adminToken = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: '1h' });
    managerToken = jwt.sign({ id: manager.id }, JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

    // Создаем тестовый стиль
    testStyle = await createTestStyle({ name: 'Тест стиль' });
  });

  describe('GET /api/v1/styles', () => {
    it('should get all styles', async () => {
      const res = await request(app)
        .get('/api/v1/styles');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert(Array.isArray(res.body.data.styles));
      assert(res.body.data.styles.length > 0);
      assert(res.body.data.styles.some(style => style.name === 'Тест стиль'));
    });
  });

  describe('GET /api/v1/styles/:id', () => {
    it('should get a style by id', async () => {
      const res = await request(app)
        .get(`/api/v1/styles/${testStyle.id}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.style.name, 'Тест стиль');
    });

    it('should return 404 if style not found', async () => {
      const res = await request(app)
        .get('/api/v1/styles/9999');

      assert.strictEqual(res.status, 404);
    });
  });

  describe('POST /api/v1/styles', () => {
    it('should create a new style as admin', async () => {
      const styleName = 'Новый тестовый стиль';
      const res = await request(app)
        .post('/api/v1/styles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: styleName });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.style.name, styleName);

      // Проверяем, что стиль действительно создан в базе
      const style = await Style.findOne({ where: { name: styleName } });
      assert(style);
      assert.strictEqual(style.name, styleName);
    });

    it('should create a new style as manager', async () => {
      const styleName = 'Стиль от менеджера';
      const res = await request(app)
        .post('/api/v1/styles')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: styleName });

      assert.strictEqual(res.status, 201);
    });

    it('should not create a style as user', async () => {
      const res = await request(app)
        .post('/api/v1/styles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Стиль от пользователя' });

      assert.strictEqual(res.status, 403);
    });

    it('should not create a style without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/styles')
        .send({ name: 'Неавторизованный стиль' });

      assert.strictEqual(res.status, 401);
    });

    it('should not create a style with existing name', async () => {
      const res = await request(app)
        .post('/api/v1/styles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Тест стиль' });

      assert.strictEqual(res.status, 400);
    });

    it('should not create a style with empty name', async () => {
      const res = await request(app)
        .post('/api/v1/styles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      assert.strictEqual(res.status, 400);
    });
  });

  describe('PUT /api/v1/styles/:id', () => {
    it('should update a style as admin', async () => {
      const style = await createTestStyle({ name: 'Стиль для обновления' });
      const res = await request(app)
        .put(`/api/v1/styles/${style.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Обновленный стиль' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.style.name, 'Обновленный стиль');

      // Проверяем, что стиль действительно обновлен в базе
      const updatedStyle = await Style.findByPk(style.id);
      assert.strictEqual(updatedStyle.name, 'Обновленный стиль');
    });

    it('should update a style as manager', async () => {
      const style = await createTestStyle({ name: 'Стиль для менеджера' });
      const res = await request(app)
        .put(`/api/v1/styles/${style.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Менеджер обновил' });

      assert.strictEqual(res.status, 200);
    });

    it('should not update a style as user', async () => {
      const res = await request(app)
        .put(`/api/v1/styles/${testStyle.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Пользователь обновил' });

      assert.strictEqual(res.status, 403);
    });

    it('should not update a style without authentication', async () => {
      const res = await request(app)
        .put(`/api/v1/styles/${testStyle.id}`)
        .send({ name: 'Неавторизованное обновление' });

      assert.strictEqual(res.status, 401);
    });

    it('should not update to an existing style name', async () => {
      const style1 = await createTestStyle({ name: 'Уникальный стиль 1' });
      const style2 = await createTestStyle({ name: 'Уникальный стиль 2' });

      const res = await request(app)
        .put(`/api/v1/styles/${style2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Уникальный стиль 1' });

      assert.strictEqual(res.status, 400);
    });

    it('should return 404 if style not found', async () => {
      const res = await request(app)
        .put('/api/v1/styles/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Несуществующий стиль' });

      assert.strictEqual(res.status, 404);
    });
  });

  describe('DELETE /api/v1/styles/:id', () => {
    it('should delete a style as admin', async () => {
      const style = await createTestStyle({ name: 'Стиль для удаления' });
      const res = await request(app)
        .delete(`/api/v1/styles/${style.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');

      // Проверяем, что стиль действительно удален из базы
      const deletedStyle = await Style.findByPk(style.id);
      assert.strictEqual(deletedStyle, null);
    });

    it('should delete a style as manager', async () => {
      const style = await createTestStyle({ name: 'Стиль для менеджера' });
      const res = await request(app)
        .delete(`/api/v1/styles/${style.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');

      // Проверяем, что стиль действительно удален из базы
      const deletedStyle = await Style.findByPk(style.id);
      assert.strictEqual(deletedStyle, null);
    });

    it('should not delete a style as user', async () => {
      const res = await request(app)
        .delete(`/api/v1/styles/${testStyle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      assert.strictEqual(res.status, 403);
    });

    it('should not delete a style without authentication', async () => {
      const res = await request(app)
        .delete(`/api/v1/styles/${testStyle.id}`);

      assert.strictEqual(res.status, 401);
    });

    it('should return 404 if style not found', async () => {
      const res = await request(app)
        .delete('/api/v1/styles/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 404);
    });
  });
}); 