const { closeDatabase } = require('./testUtils');

// Этот файл запускается последним в алфавитном порядке и отвечает за закрытие соединения
describe('zz_Cleanup After Tests', () => {
  after(async () => {
    // Закрываем соединение с базой данных после всех тестов
    await closeDatabase();
  });

  it('should complete all tests', () => {
    // Пустой тест, чтобы убедиться, что этот блок запускается
    console.log('Все тесты завершены, выполняем очистку');
  });
}); 