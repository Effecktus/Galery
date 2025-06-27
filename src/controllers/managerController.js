const { Op, fn, col } = require('sequelize');
const { Ticket } = require('../models');
exports.renderStatistics = (req, res) => {
    // Здесь вы можете подготовить любые данные для отчётов, например:
    // const reportData = await ReportService.getStats();
    // Для начала просто рендерим пустой шаблон.
    res.render('manager/statistics', {
        title: 'Статистика',
        user: res.locals.user
        // , reportData
    });
};

exports.getTicketStats = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const where = {};

        if (start_date) {
            where.booking_date = { [Op.gte]: `${start_date} 00:00:00` };
        }
        if (end_date) {
            where.booking_date = {
                ...where.booking_date,
                [Op.lte]: `${end_date} 23:59:59`
            };
        }

        const stats = await Ticket.findAll({
            where,
            attributes: [
                [ fn('SUM', col('quantity')),    'tickets_sold' ],
                [ fn('SUM', col('total_price')), 'revenue'      ]
            ]
        });

        // stats[0].dataValues содержит { tickets_sold: ..., revenue: ... }
        res.status(200).json({
            status: 'success',
            data: stats[0].dataValues
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Не удалось получить статистику: ' + err.message
        });
    }
};
