const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения из .env файла
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Получаем параметры подключения из переменных окружения
const dbName = process.env.DB_NAME || 'galerydb';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';

// Создаем экземпляр Sequelize
const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'test' ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Проверка подключения к базе данных
sequelize
  .authenticate()
  .then(() => {
    console.log('Соединение с базой данных успешно установлено');
  })
  .catch((err) => {
    console.error('Ошибка подключения к базе данных:', err.message);
  });

module.exports = sequelize; 