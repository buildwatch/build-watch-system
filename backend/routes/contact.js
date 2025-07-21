const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  // Placeholder: log contact form data
  console.log('Contact form submission:', req.body);
  res.json({ success: true, message: 'Message received.' });
});

module.exports = router; 