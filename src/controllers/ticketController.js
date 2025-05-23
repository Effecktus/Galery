// Предполагаемый код, адаптированный под изменения
const { Ticket, Exhibition, User } = require('../models');
const { Op } = require('sequelize');

const createTicket = async (req, res) => {
  try {
    const { exhibition_id, quantity } = req.body;
    const exhibition = await Exhibition.findByPk(exhibition_id);
    
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }

    if (exhibition.remaining_tickets < quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Недостаточно билетов'
      });
    }

    const total_price = exhibition.ticket_price * quantity;
    const ticket = await Ticket.create({
      user_id: req.user.id,
      exhibition_id,
      quantity,
      booking_date: new Date(),
      total_price
    });

    await exhibition.update({
      remaining_tickets: exhibition.remaining_tickets - quantity
    });

    res.status(201).json({
      status: 'success',
      data: { ticket }
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при создании билета'
    });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        { model: User, attributes: ['id', 'surname', 'first_name'] },
        { model: Exhibition, attributes: ['id', 'title'] }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      data: { tickets }
    });
  } catch (err) {
    console.error('Get all tickets error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билетов'
    });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Exhibition, attributes: ['id', 'title', 'start_date', 'end_date'] }]
    });
    
    res.status(200).json({
      status: 'success',
      data: { tickets }
    });
  } catch (err) {
    console.error('Get my tickets error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билетов'
    });
  }
};

const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{ model: Exhibition, attributes: ['id', 'title', 'start_date', 'end_date'] }]
    });
    
    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }

    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещён'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { ticket }
    });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билета'
    });
  }
};

const cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }

    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещён'
      });
    }

    const exhibition = await Exhibition.findByPk(ticket.exhibition_id);
    if (exhibition) {
      await exhibition.update({
        remaining_tickets: exhibition.remaining_tickets + ticket.quantity
      });
    }

    await ticket.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Билет успешно отменён'
    });
  } catch (err) {
    console.error('Cancel ticket error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при отмене билета'
    });
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicket,
  cancelTicket
};