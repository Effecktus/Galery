const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { getTicketStats } = require('../controllers/managerController');

// GET /api/v1/reports/tickets?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get(
    '/tickets',
    auth.protect,
    auth.restrictTo('admin','manager'),
    getTicketStats
);

module.exports = router;
