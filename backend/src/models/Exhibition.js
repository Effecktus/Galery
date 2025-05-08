const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exhibition = sequelize.define('Exhibition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  ticket_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  total_tickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  status: {
    type: DataTypes.ENUM('planned', 'active', 'completed'),
    allowNull: false,
    defaultValue: 'planned'
  },
  remaining_tickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  validate: {
    endDateAfterStartDate() {
      if (this.end_date <= this.start_date) {
        throw new Error('End date must be after start date');
      }
    },
    remainingTicketsNotExceedTotal() {
      if (this.remaining_tickets > this.total_tickets) {
        throw new Error('Remaining tickets cannot exceed total tickets');
      }
    }
  }
});

module.exports = Exhibition; 