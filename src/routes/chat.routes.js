const express = require("express");
const { prisma } = require("../prisma");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/:roomId", authenticateToken, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { roomId: req.params.roomId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: { name: true, avatar: true }
      }
    }
  });

  res.json(messages);
});

module.exports = router;
