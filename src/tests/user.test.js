const assert = require('assert');
const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { clearDatabase, createTestUser } = require('./testUtils');

// Используем JWT_SECRET из .env
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

describe('User Tests', () => {
  let adminToken;
  let managerToken;
  let userToken;
  let testUser;

  // Перед всеми тестами создаем тестовые данные
  before(async () => {
    await clearDatabase();

    // Создаем тестовых пользователей с разными ролями
    const admin = await createTestUser({ role: 'admin', email: 'admin-user@test.com' });
    const manager = await createTestUser({ role: 'manager', email: 'manager-user@test.com' });
    const user = await createTestUser({ role: 'user', email: 'user-user@test.com' });

    // Создаем JWT токены
    adminToken = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: '1h' });
    managerToken = jwt.sign({ id: manager.id }, JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

    // Создаем тестового пользователя для тестов
    testUser = await createTestUser({
      surname: 'Тестовый',
      first_name: 'Пользователь',
      patronymic: 'Тестович',
      email: 'test-user@test.com'
    });
  });

  describe('GET /api/v1/users', () => {
    it('should get all users with pagination as admin', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert(Array.isArray(res.body.data.users));
      assert(res.body.data.users.length > 0);
      assert(res.body.data.pagination);
      assert.strictEqual(typeof res.body.data.pagination.total, 'number');
      assert.strictEqual(typeof res.body.data.pagination.page, 'number');
      assert.strictEqual(typeof res.body.data.pagination.pages, 'number');
    });

    it('should get all users with custom pagination as admin', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert(Array.isArray(res.body.data.users));
      assert(res.body.data.users.length <= 2);
    });

    it('should not get users as manager', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not get users as regular user', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not get users without authentication', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/users');

      // Assert
      assert.strictEqual(res.status, 401);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user by id as admin', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.user.id, testUser.id);
      assert.strictEqual(res.body.data.user.email, testUser.email);
      assert.strictEqual(res.body.data.user.password, undefined);
    });

    it('should get own profile as regular user', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not get user without authentication', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/users/${testUser.id}`);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 for non-existent user', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/users/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 404);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update user as admin', async () => {
      // Arrange
      const updateData = {
        surname: 'Обновленный',
        first_name: 'Пользователь',
        patronymic: 'Тестович'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.user.surname, 'Обновленный');
      assert.strictEqual(res.body.data.user.first_name, 'Пользователь');

      // Проверяем, что пользователь действительно обновлен в базе
      const updatedUser = await User.findByPk(testUser.id);
      assert.strictEqual(updatedUser.surname, 'Обновленный');
      assert.strictEqual(updatedUser.first_name, 'Пользователь');
    });

    it('should update own profile as regular user', async () => {
      // Arrange
      const updateData = {
        surname: 'Сам',
        first_name: 'Обновил',
        patronymic: 'Профиль'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not update user without authentication', async () => {
      // Arrange
      const updateData = {
        surname: 'Неавторизованное',
        first_name: 'Обновление',
        patronymic: 'Профиля'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/users/${testUser.id}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should not update non-existent user', async () => {
      // Arrange
      const updateData = {
        surname: 'Несуществующий',
        first_name: 'Пользователь',
        patronymic: 'Тест'
      };

      // Act
      const res = await request(app)
        .put('/api/v1/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 404);
    });

    it('should not update user with invalid data', async () => {
      // Arrange
      const updateData = {
        email: 'invalid-email',
        role: 'invalid-role'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 400);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user as admin', async () => {
      // Arrange
      const userToDelete = await createTestUser({
        email: 'delete-user@test.com'
      });

      // Act
      const res = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');

      // Проверяем, что пользователь действительно удален из базы
      const deletedUser = await User.findByPk(userToDelete.id);
      assert.strictEqual(deletedUser, null);
    });

    it('should not delete user as manager', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not delete user as regular user', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not delete user without authentication', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/users/${testUser.id}`);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 when deleting non-existent user', async () => {
      // Act
      const res = await request(app)
        .delete('/api/v1/users/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 404);
    });
  });
}); 