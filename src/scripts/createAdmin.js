require('dotenv').config();
const { User } = require('../models');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
    try {
        // Проверяем, существует ли уже админ
        const existingAdmin = await User.findOne({
            where: { email: 'admin@example.com' }
        });

        if (existingAdmin) {
            console.log('Администратор уже существует');
            process.exit(0);
        }

        // Создаем администратора (пароль будет захеширован автоматически в хуке модели)
        const password = 'admin123'; // Вы можете изменить пароль здесь
        const admin = await User.create({
            email: 'admin@example.com',
            password: password, // Передаем пароль как есть, хеширование произойдет в хуке
            surname: 'Admin',
            first_name: 'Admin',
            role: 'admin'
        });

        console.log('Администратор успешно создан:');
        console.log('Email:', admin.email);
        console.log('Пароль:', password);
        console.log('Роль:', admin.role);

        process.exit(0);
    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        process.exit(1);
    }
};

createAdmin(); 