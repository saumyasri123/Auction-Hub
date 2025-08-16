import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to your .env and restart the server.');
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, payload) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = payload; // { id, email, role, iat, exp }
    next();
  });
}
export function generateToken(user) {
  const payload = { id: user.id, role: user.role, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });
}
