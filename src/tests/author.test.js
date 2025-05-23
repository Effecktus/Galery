const assert = require('assert');
const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { Author } = require('../models');
const { clearDatabase, createTestUser, createTestAuthor, createTestArtwork } = require('./testUtils');

// Используем JWT_SECRET из .env
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

describe('Author Tests', () => {
  let adminToken;
  let managerToken;
  let userToken;
  let testAuthor;

  // Перед всеми тестами создаем тестовые данные
  before(async () => {
    await clearDatabase();

    // Создаем тестовых пользователей с разными ролями
    const admin = await createTestUser({ role: 'admin', email: 'admin-author@test.com' });
    const manager = await createTestUser({ role: 'manager', email: 'manager-author@test.com' });
    const user = await createTestUser({ role: 'user', email: 'user-author@test.com' });

    // Создаем JWT токены
    adminToken = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: '1h' });
    managerToken = jwt.sign({ id: manager.id }, JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

    // Создаем тестового автора
    testAuthor = await createTestAuthor({
      surname: 'Тестовый',
      first_name: 'Автор',
      patronymic: 'Тестович',
      birth_date: '1980-01-01'
    });
  });

  describe('GET /api/v1/authors', () => {
    it('should get all authors', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/authors');

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert(Array.isArray(res.body.data.authors));
      assert(res.body.data.authors.length > 0);
      assert(res.body.data.authors.some(author => 
        author.surname === 'Тестовый' && author.first_name === 'Автор'));
    });
  });

  describe('GET /api/v1/authors/:id', () => {
    it('should get an author by id', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/authors/${testAuthor.id}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.author.surname, 'Тестовый');
      assert.strictEqual(res.body.data.author.first_name, 'Автор');
    });

    it('should return 404 if author not found', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/authors/9999');

      // Assert
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/v1/authors', () => {
    it('should create a new author as admin', async () => {
      // Arrange
      const authorData = {
        surname: 'Новый',
        first_name: 'Тестовый',
        patronymic: 'Автор',
        birth_date: '1990-05-15'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(authorData);

      // Assert
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.author.surname, 'Новый');
      assert.strictEqual(res.body.data.author.first_name, 'Тестовый');

      // Проверяем, что автор действительно создан в базе
      const author = await Author.findOne({ 
        where: { 
          surname: 'Новый',
          first_name: 'Тестовый'
        } 
      });
      assert(author);
      assert.strictEqual(author.surname, 'Новый');
      assert.strictEqual(author.first_name, 'Тестовый');
    });

    it('should create a new author as manager', async () => {
      // Arrange
      const authorData = {
        surname: 'Автор',
        first_name: 'От',
        patronymic: 'Менеджера',
        birth_date: '1985-03-10'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/authors')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(authorData);

      // Assert
      assert.strictEqual(res.status, 400);
    });

    it('should not create an author as user', async () => {
      // Arrange
      const authorData = {
        surname: 'Автор',
        first_name: 'От',
        patronymic: 'Пользователя',
        birth_date: '1995-07-20'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/authors')
        .set('Authorization', `Bearer ${userToken}`)
        .send(authorData);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not create an author without authentication', async () => {
      // Arrange
      const authorData = {
        surname: 'Неавторизованный',
        first_name: 'Автор',
        patronymic: 'Тест',
        birth_date: '1975-11-30'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/authors')
        .send(authorData);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should not create an author with invalid data', async () => {
      // Arrange
      const authorData = {
        surname: '',
        first_name: 'Тест',
        patronymic: 'Тестович',
        birth_date: 'invalid-date'
      };

      // Act
      const res = await request(app)
        .post('/api/v1/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(authorData);

      // Assert
      assert.strictEqual(res.status, 400);
    });

    it('should not create an author with future date of birth', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const authorData = {
        surname: 'Будущий',
        first_name: 'Автор',
        patronymic: 'Тест',
        birth_date: futureDateString
      };

      // Act
      const res = await request(app)
        .post('/api/v1/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(authorData);

      // Assert
      assert.strictEqual(res.status, 400);
    });
  });

  describe('PUT /api/v1/authors/:id', () => {
    it('should update an author as admin', async () => {
      // Arrange
      const author = await createTestAuthor({
        surname: 'Автор',
        first_name: 'Для',
        patronymic: 'Обновления',
        birth_date: '1982-08-15'
      });

      const updateData = {
        surname: 'Обновленный',
        first_name: 'Тестовый',
        patronymic: 'Автор',
        birth_date: '1982-08-15'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/authors/${author.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.author.surname, 'Обновленный');
      assert.strictEqual(res.body.data.author.first_name, 'Тестовый');

      // Проверяем, что автор действительно обновлен в базе
      const updatedAuthor = await Author.findByPk(author.id);
      assert.strictEqual(updatedAuthor.surname, 'Обновленный');
      assert.strictEqual(updatedAuthor.first_name, 'Тестовый');
    });

    it('should update an author as manager', async () => {
      // Arrange
      const author = await createTestAuthor({
        surname: 'Автор',
        first_name: 'Для',
        patronymic: 'Менеджера',
        birth_date: '1970-04-10'
      });

      const updateData = {
        surname: 'Менеджер',
        first_name: 'Обновил',
        patronymic: 'Автора',
        birth_date: '1970-04-10'
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/authors/${author.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 200);
    });

    it('should not update an author as user', async () => {
      // Act
      const updateData = {
        surname: 'Пользователь',
        first_name: 'Обновил',
        patronymic: 'Автора',
        birth_date: '1980-01-01'
      };

      const res = await request(app)
        .put(`/api/v1/authors/${testAuthor.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not update an author without authentication', async () => {
      // Act
      const updateData = {
        surname: 'Неавторизованное',
        first_name: 'Обновление',
        patronymic: 'Автора',
        birth_date: '1980-01-01'
      };

      const res = await request(app)
        .put(`/api/v1/authors/${testAuthor.id}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 if author not found', async () => {
      // Act
      const updateData = {
        surname: 'Несуществующий',
        first_name: 'Автор',
        patronymic: 'Тест',
        birth_date: '1980-01-01'
      };

      const res = await request(app)
        .put('/api/v1/authors/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 400);
    });

    it('should not allow invalid date of death', async () => {
      // Arrange
      const updateData = {
        death_date: '1970-01-01' // Ранее даты рождения (1980-01-01)
      };

      // Act
      const res = await request(app)
        .put(`/api/v1/authors/${testAuthor.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      assert.strictEqual(res.status, 400);
    });
  });

  describe('DELETE /api/v1/authors/:id', () => {
    it('should delete an author as admin', async () => {
      // Arrange
      const author = await createTestAuthor({
        surname: 'Автор',
        first_name: 'Для',
        patronymic: 'Удаления',
        birth_date: '1975-06-20'
      });

      // Act
      const res = await request(app)
        .delete(`/api/v1/authors/${author.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');

      // Проверяем, что автор действительно удален из базы
      const deletedAuthor = await Author.findByPk(author.id);
      assert.strictEqual(deletedAuthor, null);
    });

    it('should delete an author as manager', async () => {
      // Arrange
      const author = await createTestAuthor({
        surname: 'Менеджер',
        first_name: 'Удалит',
        patronymic: 'Автора',
        birth_date: '1965-09-05'
      });

      // Act
      const res = await request(app)
        .delete(`/api/v1/authors/${author.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      // Assert
      assert.strictEqual(res.status, 200);
    });

    it('should not delete an author as user', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/authors/${testAuthor.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      assert.strictEqual(res.status, 403);
    });

    it('should not delete an author without authentication', async () => {
      // Act
      const res = await request(app)
        .delete(`/api/v1/authors/${testAuthor.id}`);

      // Assert
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 if author not found', async () => {
      // Act
      const res = await request(app)
        .delete('/api/v1/authors/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 400);
    });

    it('should not delete an author with existing artworks', async () => {
      // Arrange
      const author = await createTestAuthor({
        surname: 'Автор',
        first_name: 'С',
        patronymic: 'Произведениями',
        birth_date: '1980-05-10'
      });

      // Создаем произведение искусства, связанное с автором
      await createTestArtwork({ author_id: author.id });

      // Act
      const res = await request(app)
        .delete(`/api/v1/authors/${author.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.status, 'error');
      assert(res.body.message.includes('Нельзя удалить автора, у которого есть произведения'));

      // Проверяем, что автор не был удален из базы
      const existingAuthor = await Author.findByPk(author.id);
      assert(existingAuthor);
    });
  });
}); 