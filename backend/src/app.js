const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const sequelize = require('./config/database');
const routes = require('./routes');

// Загружаем переменные окружения из .env файла
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Создаем экземпляр Express
const app = express();

// Настройка CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware для парсинга запросов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключаем маршруты
app.use(routes);

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// Запускаем сервер только если файл запущен напрямую
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
  });
}

module.exports = app; 