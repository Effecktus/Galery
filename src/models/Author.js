const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Author', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        surname: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        first_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        patronymic: {
            type: DataTypes.STRING(50),
            allowNull: true,
            validate: {
                notEmpty: true
            }
        },
        date_of_birth: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: true
            }
        },
        date_of_death: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            validate: {
                isDate: true,
                isAfterBirth(value) {
                    if (value && this.date_of_birth && value <= this.date_of_birth) {
                        throw new Error('Дата смерти должна быть позже даты рождения');
                    }
                }
            }
        }
    }, {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
}; 