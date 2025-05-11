const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const User = require('../models/User');
const sequelize = require('../config/database');

const { expect } = chai;
chai.use(chaiHttp);

describe('Auth Tests', () => {
  // Перед каждым тестом очищаем базу данных
  beforeEach(async () => {
    // Отключаем проверку внешних ключей
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Очищаем все таблицы
    await sequelize.query('TRUNCATE TABLE tickets');
    await sequelize.query('TRUNCATE TABLE artworks');
    await sequelize.query('TRUNCATE TABLE exhibitions');
    await sequelize.query('TRUNCATE TABLE authors');
    await sequelize.query('TRUNCATE TABLE styles');
    await sequelize.query('TRUNCATE TABLE genres');
    await sequelize.query('TRUNCATE TABLE users');

    // Включаем проверку внешних ключей обратно
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  // После всех тестов закрываем соединение с базой данных
  after(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/signup')
        .send({
          surname: 'Иванов',
          first_name: 'Иван',
          patronymic: 'Иванович',
          email: 'ivan@example.com',
          password: 'password123',
          role: 'user'
        });

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'success');
      expect(res.body.data.user).to.have.property('email', 'ivan@example.com');
      expect(res.body.data.user).to.not.have.property('password');
    });

    it('should not register user with existing email', async () => {
      // Сначала создаем пользователя
      await User.create({
        surname: 'Иванов',
        first_name: 'Иван',
        patronymic: 'Иванович',
        email: 'ivan@example.com',
        password: 'password123',
        role: 'user'
      });

      // Пытаемся создать пользователя с тем же email
      const res = await chai
        .request(app)
        .post('/api/auth/signup')
        .send({
          surname: 'Петров',
          first_name: 'Петр',
          patronymic: 'Петрович',
          email: 'ivan@example.com',
          password: 'password123',
          role: 'user'
        });

      expect(res).to.have.status(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Создаем пользователя для тестов входа
      await User.create({
        surname: 'Иванов',
        first_name: 'Иван',
        patronymic: 'Иванович',
        email: 'ivan@example.com',
        password: 'password123',
        role: 'user'
      });
    });

    it('should login with correct credentials', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/login')
        .send({
          email: 'ivan@example.com',
          password: 'password123'
        });

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('status', 'success');
      expect(res.body.data.user).to.have.property('email', 'ivan@example.com');
      expect(res.body.data.user).to.not.have.property('password');
    });

    it('should not login with incorrect password', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/login')
        .send({
          email: 'ivan@example.com',
          password: 'wrongpassword'
        });

      expect(res).to.have.status(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let agent;

    beforeEach(async () => {
      // Создаем пользователя
      await User.create({
        surname: 'Иванов',
        first_name: 'Иван',
        patronymic: 'Иванович',
        email: 'ivan@example.com',
        password: 'password123',
        role: 'user'
      });

      // Создаем агент для сохранения cookies
      agent = chai.request.agent(app);

      // Логинимся
      await agent
        .post('/api/auth/login')
        .send({
          email: 'ivan@example.com',
          password: 'password123'
        });
    });

    it('should get current user info when logged in', async () => {
      const res = await agent.get('/api/auth/me');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('status', 'success');
      expect(res.body.data.user).to.have.property('email', 'ivan@example.com');
    });

    it('should not get user info when not logged in', async () => {
      const res = await chai.request(app).get('/api/auth/me');

      expect(res).to.have.status(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let agent;

    beforeEach(async () => {
      // Создаем пользователя
      await User.create({
        surname: 'Иванов',
        first_name: 'Иван',
        patronymic: 'Иванович',
        email: 'ivan@example.com',
        password: 'password123',
        role: 'user'
      });

      // Создаем агент для сохранения cookies
      agent = chai.request.agent(app);

      // Логинимся
      await agent
        .post('/api/auth/login')
        .send({
          email: 'ivan@example.com',
          password: 'password123'
        });
    });

    it('should logout successfully', async () => {
      const res = await agent.post('/api/auth/logout');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('status', 'success');

      // Проверяем, что после выхода нельзя получить информацию о пользователе
      const meRes = await agent.get('/api/auth/me');
      expect(meRes).to.have.status(401);
    });
  });
}); 