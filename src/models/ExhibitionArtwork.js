const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('ExhibitionArtwork', {
        exhibition_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Exhibition',
                key: 'id'
            }
        },
        artwork_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Artwork',
                key: 'id'
            }
        }
    }, {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        tableName: 'exhibition_artwork',
        indexes: [
            {
                unique: true,
                fields: ['exhibition_id', 'artwork_id']
            }
        ]
    });
}; 