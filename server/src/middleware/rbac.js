/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if authenticated user has one of the required roles
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required prior to permission verification.'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ACCESS',
          message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
          requiredRoles: allowedRoles
        }
      });
    }

    next();
  };
}

module.exports = { authorizeRoles };
