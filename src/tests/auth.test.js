const assert = require('assert');
const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { clearDatabase, createTestUser } = require('./testUtils');

// Используем JWT_SECRET из .env
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Тесты для API аутентификации
 */
describe('Auth Tests', () => {
  // Перед каждым тестом очищаем базу данных
  beforeEach(async () => {
    await clearDatabase();
  });

  /**
   * Тесты для регистрации пользователя
   */
  describe('POST /api/v1/auth/register', () => {
    const testEmail = 'ivan@example.com';
    const testPassword = 'Password123!';
    
    it('should register a new user and return JWT token', async () => {
      // Arrange
      const userData = {
        surname: 'Иванов',
        first_name: 'Иван',
        patronymic: 'Иванович',
        email: testEmail,
        password: testPassword,
        role: 'user'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Assert
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.user.email, testEmail);
      assert.strictEqual(res.body.data.user.password, undefined);
      assert.ok(res.body.token, 'JWT token should be present');
      
      // Проверяем, что токен валидный
      const decoded = jwt.verify(res.body.token, JWT_SECRET);
      assert.strictEqual(decoded.id, res.body.data.user.id);
    });

    it('should not register user with existing email', async () => {
      // Arrange
      await createTestUser({ email: testEmail, password: testPassword });

      // Act
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          surname: 'Петров',
          first_name: 'Петр',
          patronymic: 'Петрович',
          email: testEmail,
          password: testPassword,
          role: 'user'
        });

      // Assert
      assert.strictEqual(res.status, 400);
    });
  });

  /**
   * Тесты для входа пользователя
   */
  describe('POST /api/v1/auth/login', () => {
    const testEmail = 'ivan@example.com';
    const testPassword = 'Password123!';
    
    beforeEach(async () => {
      // Создаем тестового пользователя перед каждым тестом
      await createTestUser({ email: testEmail, password: testPassword });
    });

    it('should login with correct credentials and return JWT token', async () => {
      // Arrange
      const loginData = {
        email: testEmail,
        password: testPassword
      };

      // Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.user.email, testEmail);
      assert.strictEqual(res.body.data.user.password, undefined);
      assert.ok(res.body.token, 'JWT token should be present');
      
      // Проверяем, что токен валидный
      const decoded = jwt.verify(res.body.token, JWT_SECRET);
      assert.strictEqual(decoded.id, res.body.data.user.id);
    });

    it('should not login with incorrect password', async () => {
      // Arrange
      const loginData = {
        email: testEmail,
        password: 'wrongpassword'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      // Assert
      assert.strictEqual(res.status, 401);
    });
  });

  /**
   * Тесты для получения данных текущего пользователя
   */
  describe('GET /api/v1/auth/me', () => {
    let token;
    let userId;
    const testEmail = 'ivan@example.com';
    const testPassword = 'Password123!';

    beforeEach(async () => {
      // Создаем тестового пользователя и генерируем JWT токен
      const user = await createTestUser({ email: testEmail, password: testPassword });
      userId = user.id;
      token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
    });

    it('should get current user info with valid JWT token', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.user.email, testEmail);
    });

    it('should not get user info without JWT token', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/auth/me');

      // Assert
      assert.strictEqual(res.status, 401);
    });
    
    it('should not get user info with invalid JWT token', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      // Assert
      assert.strictEqual(res.status, 401);
    });
  });
}); 