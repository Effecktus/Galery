-- drop database if exists galerydb;
create database if not exists galerydb;

use galerydb;
create table if not exists users (
	id integer primary key auto_increment,
    surname varchar(50) not null check(surname <> ''),
    first_name varchar(50) not null check(first_name <> ''),
    patronymic varchar(50) not null check(patronymic <> ''),
    email varchar(50) not null unique check(email <> '' and email like '%_@__%.__%'),
    password varchar(255) not null check(password <> ''),
    role enum('admin', 'manager', 'user') not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp
);

create table if not exists authors (
	id integer primary key auto_increment,
    surname varchar(50) not null check(surname <> ''),
    first_name varchar(50) not null check(first_name <> ''),
    patronymic varchar(50) not null check(patronymic <> ''),
    date_of_birth date not null,
    date_of_death date null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    check(date_of_death > date_of_birth)
);

create table if not exists styles (
    id integer primary key auto_increment,
    name varchar(50) not null unique,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp
);

create table if not exists genres (
    id integer primary key auto_increment,
    name varchar(50) not null unique,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp
);

create table if not exists exhibitions (
	id integer primary key auto_increment,
    title varchar(255) not null check(title <> ''),
    location varchar(255) not null check(location <> ''),
    start_date datetime not null,
    end_date datetime not null,
    ticket_price decimal(10, 2) not null check(ticket_price >= 0),
    total_tickets integer not null check(total_tickets > 0),
    status enum('planned', 'active', 'completed') not null default 'planned',
    remaining_tickets integer not null check(remaining_tickets >= 0),
    description text null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    check(end_date > start_date),
    check(remaining_tickets <= total_tickets)
);

create table if not exists artworks (
	id integer primary key auto_increment,
    title varchar(100) not null check(title <> ''),
    width decimal(10,2) null check(width > 0),
	height decimal(10,2) null check(height > 0),
    author_id integer not null,
    creation_year integer null,
    style_id integer not null,
    genre_id integer not null,
    description text null,
    image_path varchar(255),
    exhibition_id integer null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    foreign key (author_id) references authors(id),
    foreign key (style_id) references styles(id),
    foreign key (genre_id) references genres(id),
    foreign key (exhibition_id) references exhibitions(id)
);

create table if not exists tickets (
    id integer primary key auto_increment,
    exhibition_id integer not null,
    user_id integer not null,
    quantity integer not null check(quantity > 0),
    booking_date datetime not null default current_timestamp,
    total_price decimal(10, 2) not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    foreign key (exhibition_id) references exhibitions(id),
    foreign key (user_id) references users(id)
);

-- Триггер для расчета общей стоимости билетов
DELIMITER //
CREATE TRIGGER calculate_total_price
BEFORE INSERT ON tickets
FOR EACH ROW
BEGIN
    DECLARE price DECIMAL(10,2);
    
    SELECT ticket_price INTO price
    FROM exhibitions 
    WHERE id = NEW.exhibition_id;
    
    SET NEW.total_price = price * NEW.quantity;
END;//
DELIMITER ;

-- Триггер для проверки доступности билетов
DELIMITER //
CREATE TRIGGER check_ticket_availability
BEFORE INSERT ON tickets
FOR EACH ROW
BEGIN
    DECLARE available_tickets INT;
    DECLARE exhibition_status VARCHAR(20);
    
    SELECT remaining_tickets, status 
    INTO available_tickets, exhibition_status
    FROM exhibitions 
    WHERE id = NEW.exhibition_id;
    
    IF exhibition_status = 'completed' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot book tickets for completed exhibition';
    END IF;
    
    IF available_tickets < NEW.quantity THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Not enough tickets available';
    END IF;
END;//
DELIMITER ;

-- Триггер для обновления количества оставшихся билетов
DELIMITER //
CREATE TRIGGER update_remaining_tickets
AFTER INSERT ON tickets
FOR EACH ROW
BEGIN
    UPDATE exhibitions 
    SET remaining_tickets = remaining_tickets - NEW.quantity
    WHERE id = NEW.exhibition_id;
END;//
DELIMITER ;

-- Триггер для обновления статуса выставки
DELIMITER //
CREATE TRIGGER update_exhibition_status
BEFORE UPDATE ON exhibitions
FOR EACH ROW
BEGIN
    IF NEW.start_date <= CURRENT_TIMESTAMP AND NEW.end_date >= CURRENT_TIMESTAMP THEN
        SET NEW.status = 'active';
    ELSEIF NEW.end_date < CURRENT_TIMESTAMP THEN
        SET NEW.status = 'completed';
    ELSE
        SET NEW.status = 'planned';
    END IF;
END;//
DELIMITER ;

-- Триггер для проверки года создания
DELIMITER //
CREATE TRIGGER check_creation_year
BEFORE INSERT ON artworks
FOR EACH ROW
BEGIN
    IF NEW.creation_year > YEAR(CURRENT_DATE) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Creation year cannot be in the future';
    END IF;
END;//
DELIMITER ;

-- Заполнение таблицы styles
INSERT INTO styles (name) VALUES
('Реализм'),
('Импрессионизм'),
('Кубизм'),
('Абстракционизм'),
('Ренессанс'),
('Барокко');

-- Заполнение таблицы genres
INSERT INTO genres (name) VALUES
('Портрет'),
('Пейзаж'),
('Натюрморт'),
('Историческая живопись'),
('Бытовой жанр'),
('Мифологическая живопись');

-- Заполнение таблицы authors
INSERT INTO authors (surname, first_name, patronymic, date_of_birth, date_of_death) VALUES
('Леонардо', 'да', 'Винчи', '1452-04-15', '1519-05-02'),
('Ван', 'Гог', 'Гог', '1853-03-30', '1890-07-29'),
('Пикассо', 'Пабло', 'Руис', '1881-10-25', '1973-04-08'),
('Моне', 'Клод', 'Оскар', '1840-11-14', '1926-12-05'),
('Кандинский', 'Василий', 'Васильевич', '1866-12-16', '1944-12-13');

-- Заполнение таблицы users
INSERT INTO users (surname, first_name, patronymic, email, password, role) VALUES
('Иванов', 'Иван', 'Иванович', 'admin@galery.com', 'admin123', 'admin'),
('Петров', 'Петр', 'Петрович', 'manager@galery.com', 'manager123', 'manager'),
('Сидоров', 'Алексей', 'Сергеевич', 'user@galery.com', 'user123', 'user');

-- Заполнение таблицы exhibitions
INSERT INTO exhibitions (title, location, start_date, end_date, ticket_price, total_tickets, remaining_tickets, description) VALUES
('Ренессанс: Возрождение искусства', 'Главный зал галереи', '2024-03-01 10:00:00', '2024-04-01 20:00:00', 500.00, 1000, 1000, 'Выставка работ эпохи Возрождения'),
('Импрессионисты', 'Зал современного искусства', '2024-04-15 10:00:00', '2024-05-15 20:00:00', 600.00, 800, 800, 'Выставка работ импрессионистов'),
('Современное искусство', 'Новый зал', '2024-06-01 10:00:00', '2024-07-01 20:00:00', 700.00, 500, 500, 'Выставка современного искусства');

-- Заполнение таблицы artworks
INSERT INTO artworks (title, width, height, author_id, creation_year, style_id, genre_id, description, image_path, exhibition_id) VALUES
('Мона Лиза', 77.0, 53.0, 1, 1503, 5, 1, 'Портрет женщины с загадочной улыбкой', '/images/artworks/mona_lisa.jpg', 1),
('Звездная ночь', 73.7, 92.1, 2, 1889, 2, 2, 'Ночной пейзаж с кипарисами', '/images/artworks/starry_night.jpg', 2),
('Герника', 349.3, 776.6, 3, 1937, 3, 4, 'Антивоенная картина', '/images/artworks/guernica.jpg', 3),
('Водяные лилии', 200.0, 200.0, 4, 1919, 2, 2, 'Пейзаж с водяными лилиями', '/images/artworks/water_lilies.jpg', 2),
('Композиция VIII', 140.0, 201.0, 5, 1923, 4, 6, 'Абстрактная композиция', '/images/artworks/composition_viii.jpg', 3);

-- Заполнение таблицы tickets
INSERT INTO tickets (exhibition_id, user_id, quantity, total_price) VALUES
(1, 3, 2, 1000.00),
(2, 3, 1, 600.00);