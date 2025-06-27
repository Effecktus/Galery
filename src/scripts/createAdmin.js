require('dotenv').config();
const { User } = require('../models');
const bcrypt = require('bcryptjs');

const usersToCreate = [
    { surname: 'Иванов', first_name: 'Иван', patronymic: 'Иванович', email: 'ivanov1@galery.com', role: 'admin' },
    { surname: 'Петров', first_name: 'Петр', patronymic: 'Петрович', email: 'petrov1@galery.com', role: 'manager' },
    { surname: 'Сидоров', first_name: 'Алексей', patronymic: 'Сергеевич', email: 'sidorov1@galery.com', role: 'user' },
    { surname: 'Смирнова', first_name: 'Анна', patronymic: 'Владимировна', email: 'smirnova1@galery.com', role: 'user' },
    { surname: 'Кузнецов', first_name: 'Дмитрий', patronymic: 'Андреевич', email: 'kuznetsov1@galery.com', role: 'manager' },
    { surname: 'Попова', first_name: 'Екатерина', patronymic: 'Игоревна', email: 'popova1@galery.com', role: 'user' },
    { surname: 'Волков', first_name: 'Максим', patronymic: 'Алексеевич', email: 'volkov1@galery.com', role: 'user' },
    { surname: 'Соловьёв', first_name: 'Артём', patronymic: 'Валерьевич', email: 'soloviev1@galery.com', role: 'manager' },
    { surname: 'Морозова', first_name: 'Мария', patronymic: 'Александровна', email: 'morozova1@galery.com', role: 'user' },
    { surname: 'Лебедев', first_name: 'Игорь', patronymic: 'Викторович', email: 'lebedev1@galery.com', role: 'user' },
    { surname: 'Козлова', first_name: 'Ольга', patronymic: 'Павловна', email: 'kozlova1@galery.com', role: 'user' },
    { surname: 'Новиков', first_name: 'Владимир', patronymic: 'Денисович', email: 'novikov1@galery.com', role: 'manager' },
    { surname: 'Медведев', first_name: 'Александр', patronymic: 'Геннадьевич', email: 'medvedev1@galery.com', role: 'user' },
    { surname: 'Фёдорова', first_name: 'Светлана', patronymic: 'Валентиновна', email: 'fedorova1@galery.com', role: 'user' },
    { surname: 'Михайлов', first_name: 'Сергей', patronymic: 'Вячеславович', email: 'mikhailov1@galery.com', role: 'user' },
    { surname: 'Борисова', first_name: 'Юлия', patronymic: 'Артёмовна', email: 'borisova1@galery.com', role: 'user' },
    { surname: 'Егоров', first_name: 'Павел', patronymic: 'Алексеевич', email: 'egorov1@galery.com', role: 'manager' },
    { surname: 'Семенова', first_name: 'Дарья', patronymic: 'Владимировна', email: 'semenova1@galery.com', role: 'user' },
    { surname: 'Васильев', first_name: 'Георгий', patronymic: 'Петрович', email: 'vasiliev1@galery.com', role: 'user' },
    { surname: 'Григорьева', first_name: 'Татьяна', patronymic: 'Сергеевна', email: 'grigorieva1@galery.com', role: 'user' },
    { surname: 'Admin', first_name: 'Admin', patronymic: 'asd', email: 'admin@example.com', role: 'admin' },
];

const createUsers = async () => {
    try {
        const passwordPlain = '123';

        for (const user of usersToCreate) {
            const exists = await User.findOne({ where: { email: user.email } });
            if (exists) {
                console.log(`Пользователь ${user.email} уже существует`);
                continue;
            }

            await User.create({
                ...user,
                password: passwordPlain
            });

            console.log(`Пользователь ${user.email} создан (роль: ${user.role})`);
        }

        console.log('Все пользователи обработаны');
        process.exit(0);
    } catch (err) {
        console.error('Ошибка при создании пользователей:', err);
        process.exit(1);
    }
};

createUsers();
