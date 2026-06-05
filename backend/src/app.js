const express    = require('express');
const cors       = require('cors');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'SecureVault' });
});

app.use('/api/auth',  authRoutes);
app.use('/api/files', fileRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

module.exports = app;
