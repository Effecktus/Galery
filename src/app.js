const path = require('path');
const cookieParser = require('cookie-parser');

// Загружаем переменные окружения
if (process.env.NODE_ENV === 'test') {
    require('dotenv').config({ path: path.join(__dirname, '../.env.test') });
} else {
    require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const db = require('./models');
const setUser = require('./middleware/setUser');
const authController = require('./controllers/authController');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Подключение к базе данных
db.sequelize.authenticate()
    .then(() => console.log('Database connected...'))
    .catch(err => {
        console.error('Unable to connect to the database:', err);
        process.exit(1);
    });

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Устанавливаем пользователя в res.locals
app.use(setUser);

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const artworkRoutes = require('./routes/artworkRoutes');
const exhibitionRoutes = require('./routes/exhibitionRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const styleRoutes = require('./routes/styleRoutes');
const genreRoutes = require('./routes/genreRoutes');
const authorRoutes = require('./routes/authorRoutes');

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/artworks', artworkRoutes);
app.use('/api/v1/exhibitions', exhibitionRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/styles', styleRoutes);
app.use('/api/v1/genres', genreRoutes);
app.use('/api/v1/authors', authorRoutes);

// Frontend routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Главная страница',
        user: res.locals.user || null
    });
});

app.get('/auth/login', (req, res) => {
    if (res.locals.user) {
        return res.redirect('/admin');
    }
    res.render('auth/login', { 
        title: 'Вход',
        user: null
    });
});

app.post('/auth/login', authController.login);

app.get('/auth/register', (req, res) => {
    if (res.locals.user) {
        return res.redirect('/');
    }
    res.render('auth/register', { 
        title: 'Регистрация',
        user: null
    });
});

app.post('/auth/register', authController.register);

app.get('/auth/logout', (req, res) => {
    // Очищаем все куки
    res.clearCookie('token');
    res.clearCookie('connect.sid');

    // Перенаправляем на страницу входа
    res.redirect('/auth/login');
});

app.get('/admin', (req, res) => {
    console.log('Admin route accessed. User:', res.locals.user);
    if (!res.locals.user || res.locals.user.role !== 'admin') {
        console.log('Access denied. User role:', res.locals.user?.role);
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Требуются права администратора',
            error: { status: 403 },
            user: res.locals.user
        });
    }
    console.log('Access granted. Rendering admin panel');
    res.render('admin/index', {
        title: 'Панель администратора',
        user: res.locals.user
    });
});

// Маршрут для страницы управления жанрами
app.get('/admin/genres', (req, res) => {
    if (!res.locals.user || res.locals.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Требуются права администратора',
            error: { status: 403 },
            user: res.locals.user
        });
    }
    res.render('admin/genres', {
        title: 'Управление жанрами',
        user: res.locals.user
    });
});

// Маршрут для страницы управления стилями
app.get('/admin/styles', (req, res) => {
    if (!res.locals.user || res.locals.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Требуются права администратора',
            error: { status: 403 },
            user: res.locals.user
        });
    }
    res.render('admin/styles', {
        title: 'Управление жанрами',
        user: res.locals.user
    });
});

// Маршрут для страницы управления авторами
app.get('/admin/authors', (req, res) => {
    if (!res.locals.user || res.locals.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Требуются права администратора',
            error: { status: 403 },
            user: res.locals.user
        });
    }
    res.render('admin/authors', {
        title: 'Управление авторами',
        user: res.locals.user
    });
});

// Маршрут для страницы управления пользователями
app.get('/admin/users', (req, res) => {
    if (!res.locals.user || res.locals.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Требуются права администратора',
            error: { status: 403 },
            user: res.locals.user
        });
    }
    res.render('admin/users', {
        title: 'Управление пользователями',
        user: res.locals.user
    });
});

// Маршрут для страницы управления произведениями искусства
app.get('/admin/artworks', (req, res) => {
    if (!res.locals.user || res.locals.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Требуются права администратора',
            error: { status: 403 },
            user: res.locals.user
        });
    }
    res.render('admin/artworks', {
        title: 'Управление произведениями искусства',
        user: res.locals.user
    });
});

// Маршрут для страницы управления выставками
app.get('/manager/exhibitions', (req, res) => {
    if (!res.locals.user || (res.locals.user.role !== 'admin' && res.locals.user.role !== 'manager')) {
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Требуются права администратора/менеджера',
            error: { status: 403 },
            user: res.locals.user
        });
    }
    res.render('manager/exhibitions', {
        title: 'Управление выставками',
        user: res.locals.user
    });
});

// Обработка 404 ошибок
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Страница не найдена',
        message: 'Запрашиваемая страница не существует',
        error: { status: 404 },
        user: res.locals.user || null
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).render('error', {
        title: 'Ошибка',
        message: err.message || 'Что-то пошло не так',
        error: process.env.NODE_ENV === 'development' ? err : {},
        user: res.locals.user || null
    });
});

// Экспортируем приложение для тестов
module.exports = app;

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});