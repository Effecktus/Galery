const { initDatabase } = require('./testUtils');

// Этот файл запускается первым в алфавитном порядке и отвечает за инициализацию соединения
describe('Database Connection Setup', () => {
  before(async () => {
    // Инициализируем соединение с базой данных перед всеми тестами
    await initDatabase();
  });

  it('should connect to database', () => {
    // Пустой тест для подтверждения успешной инициализации
    console.log('Соединение с базой данных инициализировано');
  });
}); 