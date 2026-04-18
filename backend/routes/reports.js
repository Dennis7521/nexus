const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/reports
 * Create a new report (User endpoint)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { reportedUserId, exchangeId, reason, description } = req.body;

    console.log('📝 Report submission:', {
      reporterId,
      reportedUserId,
      exchangeId,
      reason,
      reporterIdType: typeof reporterId,
      reportedUserIdType: typeof reportedUserId
    });

    // Validation
    if (!reportedUserId || !reason) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'Reported user ID and reason are required' 
      });
    }

    // Prevent self-reporting (convert both to strings for comparison)
    if (String(reporterId) === String(reportedUserId)) {
      console.log('❌ Self-reporting attempt detected');
      return res.status(400).json({ 
        error: 'You cannot report yourself' 
      });
    }

    // Check for duplicate pending report
    if (exchangeId) {
      const hasPending = await Report.hasPendingReport(reporterId, reportedUserId, exchangeId);
      if (hasPending) {
        return res.status(400).json({ 
          error: 'You have already submitted a pending report for this user in this exchange' 
        });
      }
    }

    // Create the report
    const report = await Report.create({
      reporterId,
      reportedUserId,
      exchangeId: exchangeId || null,
      reason,
      description: description || null
    });

    res.status(201).json({ 
      message: 'Report submitted successfully. Our team will review it shortly.',
      report 
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * GET /api/reports/my-reports
 * Get reports filed by the current user
 */
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const reports = await Report.getByReporter(req.user.id);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

module.exports = router;
