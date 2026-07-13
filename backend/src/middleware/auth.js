import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smartvet-dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '12h',
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

// Paravets, super_admins, and vetboard members get read-only access on operational routes.
export function blockReadOnlyRoles(req, res, next) {
  if (['paravet', 'super_admin', 'vetboard'].includes(req.user?.role) && req.method !== 'GET') {
    return res.status(403).json({ error: 'Your role has read-only access on this resource' });
  }
  next();
}

export { JWT_SECRET };
