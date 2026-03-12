const express = require('express');
const router = express.Router();
const { requiresAuth } = require('../middleware/auth');
const userProfileService = require('../services/userProfileService');

router.get('/nova-money', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const profile = await userProfileService.getProfileByUserId(userId);

    res.json({
      success: true,
      profile: {
        novaMoneyTenant: profile?.nova_money_tenant || '',
        hasNovaMoneyApiKey: Boolean(profile?.nova_money_api_key)
      }
    });
  } catch (error) {
    console.error('Error fetching Nova.Money profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Nova.Money profile',
      message: error.message
    });
  }
});

router.put('/nova-money', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const { novaMoneyTenant, novaMoneyApiKey } = req.body;

    if (!novaMoneyTenant) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Nova.Money tenant is required'
      });
    }

    const existingProfile = await userProfileService.getProfileByUserId(userId);
    const existingKey = existingProfile?.nova_money_api_key || '';
    const normalizedKey = novaMoneyApiKey ? String(novaMoneyApiKey).trim() : '';
    const resolvedKey = normalizedKey || existingKey;

    if (!resolvedKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Nova.Money API key is required'
      });
    }

    await userProfileService.upsertProfile(userId, {
      nova_money_api_key: resolvedKey,
      nova_money_tenant: String(novaMoneyTenant).trim()
    });

    res.json({
      success: true,
      profile: {
        novaMoneyTenant: String(novaMoneyTenant).trim(),
        hasNovaMoneyApiKey: true
      },
      message: 'Nova.Money settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving Nova.Money profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save Nova.Money profile',
      message: error.message
    });
  }
});

module.exports = router;
