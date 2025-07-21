const express = require('express');
const router = express.Router();

const resources = [
  { name: 'Project List CSV', type: 'csv', url: '/files/project-list.csv' },
  { name: 'Budget Report PDF', type: 'pdf', url: '/files/budget-report.pdf' },
];

router.get('/', (req, res) => {
  res.json(resources);
});

module.exports = router; 