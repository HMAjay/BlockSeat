// Restricts gate operations to explicitly allowlisted gate-admin BST IDs.
module.exports = (req, res, next) => {
  if (!req.user?.isGateAdmin) {
    return res.status(403).json({ message: "Forbidden: gate admin access required" });
  }

  return next();
};
