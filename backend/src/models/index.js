const User = require('./User');
const Author = require('./Author');
const Style = require('./Style');
const Genre = require('./Genre');
const Exhibition = require('./Exhibition');
const Artwork = require('./Artwork');
const Ticket = require('./Ticket');

// Определение связей
Artwork.belongsTo(Author, { foreignKey: 'author_id' });
Author.hasMany(Artwork, { foreignKey: 'author_id' });

Artwork.belongsTo(Style, { foreignKey: 'style_id' });
Style.hasMany(Artwork, { foreignKey: 'style_id' });

Artwork.belongsTo(Genre, { foreignKey: 'genre_id' });
Genre.hasMany(Artwork, { foreignKey: 'genre_id' });

Artwork.belongsTo(Exhibition, { foreignKey: 'exhibition_id' });
Exhibition.hasMany(Artwork, { foreignKey: 'exhibition_id' });

Ticket.belongsTo(Exhibition, { foreignKey: 'exhibition_id' });
Exhibition.hasMany(Ticket, { foreignKey: 'exhibition_id' });

Ticket.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Ticket, { foreignKey: 'user_id' });

module.exports = {
  User,
  Author,
  Style,
  Genre,
  Exhibition,
  Artwork,
  Ticket
}; 