const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Ticket = sequelize.define('Ticket', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        exhibition_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Exhibition',
                key: 'id'
            }
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1
            }
        },
        booking_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        total_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    }, {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        hooks: {
            beforeCreate: async (ticket) => {
                // Получаем информацию о выставке
                const exhibition = await sequelize.models.Exhibition.findByPk(ticket.exhibition_id);
                
                if (!exhibition) {
                    throw new Error('Выставка не найдена');
                }

                if (exhibition.status === 'completed') {
                    throw new Error('Нельзя забронировать билеты на завершенную выставку');
                }

                if (exhibition.remaining_tickets < ticket.quantity) {
                    throw new Error('Недостаточно доступных билетов');
                }

                // Рассчитываем общую стоимость
                ticket.total_price = exhibition.ticket_price * ticket.quantity;
            },
            afterCreate: async (ticket) => {
                // Обновляем количество оставшихся билетов
                await sequelize.models.Exhibition.decrement('remaining_tickets', {
                    by: ticket.quantity,
                    where: { id: ticket.exhibition_id }
                });
            }
        }
    });

    return Ticket;
}; 