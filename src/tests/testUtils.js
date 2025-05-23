const bcrypt = require('bcryptjs');
const { User, Author, Style, Genre, Exhibition, Artwork, Ticket, sequelize } = require('../models');

// Флаг, чтобы отслеживать, открыто ли соединение
let isConnectionOpen = false;

/**
 * Инициализирует соединение с базой данных перед всеми тестами
 */
exports.initDatabase = async () => {
  if (!isConnectionOpen) {
    try {
      // Отключаем логирование SQL-запросов для тестов
      sequelize.options.logging = false;
      await sequelize.authenticate();
      isConnectionOpen = true;
    } catch (error) {
      console.error('Ошибка подключения к базе данных для тестов:', error);
      throw error;
    }
  }
};

/**
 * Закрывает соединение с базой данных после всех тестов
 */
exports.closeDatabase = async () => {
  if (isConnectionOpen) {
    await sequelize.close();
    isConnectionOpen = false;
  }
};

/**
 * Очистка базы данных перед тестами
 */
exports.clearDatabase = async () => {
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
};

/**
 * Создает тестового пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {Promise<Object>} - Созданный пользователь
 */
exports.createTestUser = async (userData = {}) => {
  const timestamp = Date.now();
  const defaultData = {
    surname: 'Тестов',
    first_name: 'Тест',
    patronymic: 'Тестович',
    email: `test-${timestamp}@example.com`,
    password: 'Test123!@#',
    role: 'user'
  };

  const data = { ...defaultData, ...userData };
  
  // Если email не был явно указан в userData, используем уникальный email
  if (!userData.email) {
    data.email = `test-${timestamp}@example.com`;
  }

  // Создаем пользователя с включенными хуками для правильной валидации и хэширования пароля
  return await User.create(data);
};

/**
 * Создает тестовый стиль
 * @param {Object} styleData - Данные стиля
 * @returns {Promise<Object>} - Созданный стиль
 */
exports.createTestStyle = async (styleData = {}) => {
  const defaultData = {
    name: `Тестовый стиль ${Date.now()}`
  };

  const data = { ...defaultData, ...styleData };
  return await Style.create(data);
};

/**
 * Создает тестовый жанр
 * @param {Object} genreData - Данные жанра
 * @returns {Promise<Object>} - Созданный жанр
 */
exports.createTestGenre = async (genreData = {}) => {
  const defaultData = {
    name: `Тестовый жанр ${Date.now()}`
  };

  const data = { ...defaultData, ...genreData };
  return await Genre.create(data);
};

/**
 * Создает тестового автора
 * @param {Object} authorData - Данные автора
 * @returns {Promise<Object>} - Созданный автор
 */
exports.createTestAuthor = async (authorData = {}) => {
  const defaultData = {
    surname: 'Тестов',
    first_name: 'Автор',
    patronymic: 'Тестович',
    date_of_birth: '1980-01-01',
    date_of_death: null
  };

  const data = { ...defaultData, ...authorData };
  return await Author.create(data);
};

/**
 * Создает тестовую выставку
 * @param {Object} exhibitionData - Данные выставки
 * @returns {Promise<Object>} - Созданная выставка
 */
exports.createTestExhibition = async (exhibitionData = {}) => {
  const defaultData = {
    title: `Тестовая выставка ${Date.now()}`,
    location: 'Тестовая локация',
    start_date: new Date(Date.now() + 86400000), // + 1 день
    end_date: new Date(Date.now() + 2 * 86400000), // + 2 дня
    ticket_price: 100.00,
    total_tickets: 100,
    remaining_tickets: 100,
    status: 'planned',
    description: 'Тестовое описание выставки'
  };

  const data = { ...defaultData, ...exhibitionData };
  return await Exhibition.create(data);
};

/**
 * Создает тестовое произведение искусства
 * @param {Object} artworkData - Данные произведения
 * @returns {Promise<Object>} - Созданное произведение
 */
exports.createTestArtwork = async (artworkData = {}) => {
  try {
    let author, style, genre, exhibition;
    if (artworkData.author_id) {
      author = await Author.findByPk(artworkData.author_id);
      if (!author) throw new Error('Author not found');
    } else {
      author = await exports.createTestAuthor();
    }
    if (artworkData.style_id) {
      style = await Style.findByPk(artworkData.style_id);
      if (!style) throw new Error('Style not found');
    } else {
      style = await exports.createTestStyle();
    }
    if (artworkData.genre_id) {
      genre = await Genre.findByPk(artworkData.genre_id);
      if (!genre) throw new Error('Genre not found');
    } else {
      genre = await exports.createTestGenre();
    }
    if (artworkData.exhibition_id) {
      exhibition = await Exhibition.findByPk(artworkData.exhibition_id);
      if (!exhibition) throw new Error('Exhibition not found');
    } else {
      exhibition = await exports.createTestExhibition();
    }
    const defaultData = {
      title: `Тестовая картина ${Date.now()}`,
      description: 'Тестовое описание картины',
      width: 100.0,
      height: 80.0,
      creation_year: 2000,
      image_path: '/images/test.jpg',
      author_id: author.id,
      style_id: style.id,
      genre_id: genre.id,
      exhibition_id: exhibition.id
    };
    const data = { ...defaultData, ...artworkData };
    // Удаляем поле price, если оно случайно передано
    delete data.price;
    return await Artwork.create(data);
  } catch (error) {
    console.error('Error creating test artwork:', error);
    throw error;
  }
};

/**
 * Создает тестовый билет
 * @param {Object} ticketData - Данные билета
 * @returns {Promise<Object>} - Созданный билет
 */
exports.createTestTicket = async (ticketData = {}) => {
  // Создаем зависимости, если они не переданы
  const user = ticketData.user_id ? { id: ticketData.user_id } : await exports.createTestUser();
  const exhibition = ticketData.exhibition_id ? 
    { id: ticketData.exhibition_id } : 
    await exports.createTestExhibition();
  
  const defaultData = {
    exhibition_id: exhibition.id,
    user_id: user.id,
    quantity: 2,
    booking_date: new Date(),
    visit_date: new Date(Date.now() + 86400000), // + 1 день
    price: exhibition.ticket_price || 100.00,
    total_price: (exhibition.ticket_price || 100.00) * 2
  };

  const data = { ...defaultData, ...ticketData };
  // Пересчитываем total_price если изменились quantity или price
  if (ticketData.quantity || ticketData.price) {
    data.total_price = (data.price || defaultData.price) * (data.quantity || defaultData.quantity);
  }
  return await Ticket.create(data);
}; 