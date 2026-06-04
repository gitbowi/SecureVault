const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/database');
const { logActivity } = require('../utils/logger');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-50 characters: letters, numbers, underscores only.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email or username already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash]
    );

    const user  = result.rows[0];
    const token = generateToken(user);

    await logActivity(user.id, 'register', null, 'Account created', req.ip);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Use a constant-time comparison path even for missing users to prevent timing attacks
    const user         = result.rows[0];
    const dummyHash    = '$2a$12$invalidhashfortimingpurposesonly000000000000000000000';
    const hashToCheck  = user ? user.password_hash : dummyHash;
    const valid        = await bcrypt.compare(password, hashToCheck);

    if (!user || !valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    await logActivity(user.id, 'login', null, 'User logged in', req.ip);

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
