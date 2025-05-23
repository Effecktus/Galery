require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const db = require('./models');
const { protect } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

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

app.get('/login', (req, res) => {
    if (res.locals.user) {
        return res.redirect('/');
    }
    res.render('auth/login', { 
        title: 'Вход',
        user: null
    });
});

app.get('/register', (req, res) => {
    if (res.locals.user) {
        return res.redirect('/');
    }
    res.render('auth/register', { 
        title: 'Регистрация',
        user: null
    });
});

app.get('/exhibitions', (req, res) => {
    res.render('exhibitions/index', { 
        title: 'Выставки',
        user: res.locals.user || null
    });
});

app.get('/artworks', (req, res) => {
    res.render('artworks/index', { 
        title: 'Картины',
        user: res.locals.user || null
    });
});

app.get('/tickets', protect, (req, res) => {
    res.render('tickets/index', {
        title: 'Мои билеты',
        user: res.locals.user
    });
});

app.get('/admin/users', protect, (req, res) => {
    if (req.user.role !== 'admin') {
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

// Обработка 404 ошибок
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Страница не найдена',
        message: 'Запрашиваемая страница не существует',
        error: { status: 404 },
        user: res.locals.user || null,
        status: 'error'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).render('error', {
        title: 'Ошибка',
        message: err.message || 'Что-то пошло не так',
        error: process.env.NODE_ENV === 'development' ? err : {},
        user: res.locals.user || null,
        status: 'error'
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