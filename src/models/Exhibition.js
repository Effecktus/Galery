const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Exhibition = sequelize.define('Exhibition', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true }
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true }
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    opening_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '10:00:00'
    },
    closing_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '18:00:00'
    },
    ticket_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 }
    },
    total_tickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 }
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'active', 'completed'),
      allowNull: false,
      defaultValue: 'upcoming'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remaining_tickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 }
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeSave: async (exhibition) => {
        const now = new Date();
        const startDateTime = new Date(
          exhibition.start_date.toISOString().slice(0, 10) + 'T' + (exhibition.opening_time || '10:00:00')
        );
        const endDateTime = new Date(
          exhibition.end_date.toISOString().slice(0, 10) + 'T' + (exhibition.closing_time || '18:00:00')
        );
        if (now < startDateTime) {
          exhibition.status = 'upcoming';
        } else if (now >= startDateTime && now <= endDateTime) {
          exhibition.status = 'active';
        } else if (now > endDateTime) {
          exhibition.status = 'completed';
        }
      }
    },
    validate: {
      endDateAfterStartDate() {
        if (this.end_date <= this.start_date) {
          throw new Error('Дата окончания должна быть позже даты начала');
        }
      },
      remainingTicketsNotExceedTotal() {
        if (this.remaining_tickets > this.total_tickets) {
          throw new Error('Количество оставшихся билетов не может превышать общее количество билетов');
        }
      }
    }
  });

  return Exhibition;
}; 