const { z } = require("zod");

const eventIdParamSchema = z.object({
  id: z.string().min(1, "Event ID is required")
});

module.exports = { eventIdParamSchema };
