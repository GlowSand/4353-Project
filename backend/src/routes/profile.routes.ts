import { Router } from 'express';
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile
} from '../controllers/profile.controller';

const router = Router();

/**
 * @route   GET /api/profile
 * @desc    Get all profiles
 * @access  Public (will add auth later)
 */
router.get('/', getAllProfiles);

/**
 * @route   GET /api/profile/:userId
 * @desc    Get profile by user ID
 * @access  Public (will add auth later)
 */
router.get('/:userId', getProfileById);

/**
 * @route   POST /api/profile/:userId
 * @desc    Create a new profile
 * @access  Public (will add auth later)
 */
router.post('/:userId', createProfile);

/**
 * @route   PUT /api/profile/:userId
 * @desc    Update an existing profile
 * @access  Public (will add auth later)
 */
router.put('/:userId', updateProfile);

/**
 * @route   DELETE /api/profile/:userId
 * @desc    Delete a profile
 * @access  Public (will add auth later)
 */
router.delete('/:userId', deleteProfile);

export default router;
