const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        pool: config.pool,
        define: config.define,
        logging: config.logging
    }
);

// Импортируем модели
const UserModel = require('./User');
const AuthorModel = require('./Author');
const StyleModel = require('./Style');
const GenreModel = require('./Genre');
const ExhibitionModel = require('./Exhibition');
const ArtworkModel = require('./Artwork');
const TicketModel = require('./Ticket');
const ExhibitionArtworkModel = require('./ExhibitionArtwork');

// Инициализируем модели
const User = UserModel(sequelize);
const Author = AuthorModel(sequelize);
const Style = StyleModel(sequelize);
const Genre = GenreModel(sequelize);
const Exhibition = ExhibitionModel(sequelize);
const Artwork = ArtworkModel(sequelize);
const Ticket = TicketModel(sequelize);
const ExhibitionArtwork = ExhibitionArtworkModel(sequelize);

// Определение связей
Artwork.belongsTo(Author, { foreignKey: 'author_id' });
Author.hasMany(Artwork, { foreignKey: 'author_id' });

Artwork.belongsTo(Style, { foreignKey: 'style_id' });
Style.hasMany(Artwork, { foreignKey: 'style_id' });

Artwork.belongsTo(Genre, { foreignKey: 'genre_id' });
Genre.hasMany(Artwork, { foreignKey: 'genre_id' });

// Многие-ко-многим связь между Exhibition и Artwork
Artwork.belongsToMany(Exhibition, { 
    through: ExhibitionArtwork,
    foreignKey: 'artwork_id'
});
Exhibition.belongsToMany(Artwork, { 
    through: ExhibitionArtwork,
    foreignKey: 'exhibition_id'
});

Ticket.belongsTo(Exhibition, { foreignKey: 'exhibition_id' });
Exhibition.hasMany(Ticket, { foreignKey: 'exhibition_id' });

Ticket.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Ticket, { foreignKey: 'user_id' });

module.exports = {
    sequelize,
    Sequelize,
    User,
    Author,
    Style,
    Genre,
    Exhibition,
    Artwork,
    Ticket,
    ExhibitionArtwork
}; 