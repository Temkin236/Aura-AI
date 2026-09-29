import { Request, Response, NextFunction } from 'express';
import { validateSession, toSafeUser, hasRole, SESSION_COOKIE_NAME } from '../auth/service';
import { SafeUser, DbSession, DbRoleType } from '../db/types';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      session?: DbSession;
    }
  }
}

/**
 * Extracts raw session token from cookies or Authorization Bearer header.
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Signed or unsigned HTTP-Only Cookie
  if (req.signedCookies && typeof req.signedCookies[SESSION_COOKIE_NAME] === 'string') {
    const cookieVal = req.signedCookies[SESSION_COOKIE_NAME].trim();
    if (cookieVal) return cookieVal;
  }
  if (req.cookies && typeof req.cookies[SESSION_COOKIE_NAME] === 'string') {
    const cookieVal = req.cookies[SESSION_COOKIE_NAME].trim();
    if (cookieVal) return cookieVal;
  }

  // 2. Authorization Bearer header fallback (useful for API clients & tests)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  return null;
}

/**
 * Middleware requiring a valid, authenticated session.
 * Rejects unauthenticated requests with HTTP 401.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractSessionToken(req);

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const sessionData = await validateSession(undefined, token);

    if (!sessionData) {
      res.status(401).json({ error: 'Session is invalid or has expired. Please sign in again.' });
      return;
    }

    req.user = toSafeUser(sessionData.user, sessionData.profile, sessionData.role);
    req.session = sessionData.session;
    next();
  } catch (err: any) {
    console.error('Authentication middleware error:', err.message);
    res.status(500).json({ error: 'Internal authentication validation error.' });
  }
}

/**
 * Middleware requiring a specific server-side role (e.g. 'ADMIN').
 * Evaluates the live database to guarantee fresh authorization.
 * Returns 401 if unauthenticated, 403 if authenticated but not authorized.
 */
export function requireRole(requiredRole: DbRoleType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. If not yet authenticated, try to authenticate first
    if (!req.user || !req.user.id) {
      const token = extractSessionToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication required. Please sign in.' });
        return;
      }

      try {
        const sessionData = await validateSession(undefined, token);
        if (!sessionData) {
          res.status(401).json({ error: 'Session is invalid or has expired. Please sign in again.' });
          return;
        }
        req.user = toSafeUser(sessionData.user, sessionData.profile, sessionData.role);
        req.session = sessionData.session;
      } catch (err: any) {
        console.error('Authorization middleware authentication error:', err.message);
        res.status(500).json({ error: 'Internal authorization validation error.' });
        return;
      }
    }

    // 2. Perform live database role check (guarantees freshness and prevents client spoofing)
    try {
      const authorized = await hasRole(req.user.id, requiredRole);
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
        return;
      }

      next();
    } catch (err: any) {
      console.error('Role authorization error:', err.message);
      res.status(500).json({ error: 'Internal authorization validation error.' });
    }
  };
}

export const requireAdmin = requireRole('ADMIN');

/**
 * Middleware that populates req.user if a valid session exists, but doesn't block unauthenticated requests.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractSessionToken(req);

  if (!token) {
    return next();
  }

  try {
    const sessionData = await validateSession(undefined, token);
    if (sessionData) {
      req.user = toSafeUser(sessionData.user, sessionData.profile, sessionData.role);
      req.session = sessionData.session;
    }
  } catch {
    // Ignore error for optional authentication
  }

  next();
}
