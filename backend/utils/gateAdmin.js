// Helpers for resolving which BST IDs are allowed to operate the gate scanner.
const BST_ID_REGEX = /^BST-\d{4}-\d{5}$/;

const getGateAdminBstIds = () =>
  new Set(
    String(process.env.GATE_ADMIN_BST_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

const isGateAdminBstId = (bstId) => getGateAdminBstIds().has(String(bstId || "").trim());

const hasValidGateAdminConfig = () => {
  const ids = [...getGateAdminBstIds()];
  return ids.every((id) => BST_ID_REGEX.test(id));
};

module.exports = { getGateAdminBstIds, isGateAdminBstId, hasValidGateAdminConfig };
