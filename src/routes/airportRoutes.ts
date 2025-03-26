import { Router } from 'express';

// This file will contain all airport-related routes
const router = Router();

/**
 * @route   GET /api/airports
 * @desc    Get all airports
 * @access  Public
 */
router.get('/', (req, res) => {
  // This will be implemented in the airports management step
  res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * @route   GET /api/airports/popular
 * @desc    Get popular airports
 * @access  Public
 */
router.get('/popular', (req, res) => {
  // This will be implemented in the airports management step
  res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * @route   GET /api/airports/search
 * @desc    Search airports
 * @access  Public
 */
router.get('/search', (req, res) => {
  // This will be implemented in the airports management step
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
