const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false, // Set to console.log to see SQL queries
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