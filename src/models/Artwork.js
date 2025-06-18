const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Artwork', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        width: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            validate: {
                min: 0,
                notEmpty: true
            }
        },
        height: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            validate: {
                min: 0,
                notEmpty: true
            }
        },
        author_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Author',
                key: 'id'
            }
        },
        creation_year: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                isNotFuture(value) {
                    if (value && value > new Date().getFullYear()) {
                        throw new Error('Год создания не может быть в будущем');
                    }
                },
                notEmpty: true
            }
        },
        style_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Style',
                key: 'id'
            }
        },
        genre_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Genre',
                key: 'id'
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        image_path: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    }, {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
}; 