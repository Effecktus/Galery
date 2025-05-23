const { expect } = require('chai');
const { initDatabase, closeDatabase } = require('./testUtils');

// Глобальные хуки для всех тестов
before(async function() {
  // Инициализируем соединение с базой данных перед всеми тестами
  await initDatabase();
});

after(async function() {
  // Закрываем соединение с базой данных после всех тестов
  await closeDatabase();
});

// Пустой тест, чтобы файл не считался пустым
describe('Setup', () => {
  it('should initialize test environment', () => {
    // Этот тест всегда проходит
    expect(true).to.be.true;
  });
}); 