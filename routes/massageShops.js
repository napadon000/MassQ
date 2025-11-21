const express = require('express');
const {getMassageShops, getMassageShop, createMassageShop, updateMassageShop, deleteMassageShop} = require('../controllers/massageShops');

//Include other resource routers
const reservationRouter = require('./reservations');

const router = express.Router();

const {protect, authorize, role} = require("../middleware/auth");

//Re-route into other resource routers
router.use('/:massageShopId/reservations', reservationRouter);

router.route('/').get(role, getMassageShops).post(protect, authorize('admin'), createMassageShop);
router.route('/:id').get(getMassageShop).put(protect, authorize('admin'), updateMassageShop).delete(protect, authorize('admin'), deleteMassageShop);

module.exports = router;
