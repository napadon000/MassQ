const History = require('../models/History');
const analyzeSentiment = require('../services/sentiment');

//@desc Get all histories
//@route GET /api/v1/histories
//@access Private
exports.getHistories = async (req, res, next) => {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over remove fields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Parse the query
    const parsedQuery = JSON.parse(queryStr);

    // If user is not admin, only show their own histories
    if (req.user.role !== 'admin') {
        parsedQuery.user = req.user.id;
    }

    // Finding resource
    query = History.find(parsedQuery)
        .populate({
            path: 'user',
            select: 'name email telephone'
        })
        .populate({
            path: 'massageShop',
            select: 'name address telephone'
        });

    // Select Fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-completedAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const total = await History.countDocuments(parsedQuery);
        query = query.skip(startIndex).limit(limit);

        // Execute query
        const histories = await query;

        // Pagination result
        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({
            success: true,
            count: histories.length,
            total: total,
            pagination,
            data: histories
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

//@desc Get single history
//@route GET /api/v1/histories/:id
//@access Private
exports.getHistory = async (req, res, next) => {
    try {
        const history = await History.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'name email telephone'
            })
            .populate({
                path: 'massageShop',
                select: 'name address telephone'
            });

        if (!history) {
            return res.status(404).json({
                success: false,
                message: 'History not found'
            });
        }

        // Make sure user is history owner or admin
        if (history.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this history'
            });
        }

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

//@desc Create new history
//@route POST /api/v1/histories
//@access Private (Admin only)
exports.createHistory = async (req, res, next) => {
    try {
        const history = await History.create(req.body);

        res.status(201).json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

//@desc Update history
//@route PUT /api/v1/histories/:id
//@access Private
exports.updateHistory = async (req, res, next) => {
    try {
        const history = await History.findById(req.params.id);

        if (!history) {
            return res.status(404).json({
                success: false,
                message: 'History not found'
            });
        }

        //owner checking
        if (history.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this history'
            });
        }

        //if not admin, allow only review update
        if (req.user.role !== 'admin') {
            const updates = Object.keys(req.body);
            const isValidOperation = updates.every(update => update==='review');
            if (!isValidOperation) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update these fields'
                });
            }

            if (history.status !== 'completed') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot submit review for incomplete history'
                });
            }

            if (history.review) {
                return res.status(403).json({
                    success: false,
                    message: 'Review already submitted, cannot update'
                });
            }
        }
        if (req.body.review) {
          const rating = await analyzeSentiment(req.body.review);
          req.body.rating = rating;
        }

        //update
        history.set(req.body, null, { strict: false });
        await history.save();
        console.log(req.body);

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
