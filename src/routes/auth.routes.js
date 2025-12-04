const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../prisma");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "";

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, name, passwordHash }
    });

    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET);

    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: "User exists or invalid data" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(403).json({ error: "Wrong password" });

  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET);

  res.json({ token, user });
});

// Me
router.get("/me", authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  res.json({ user });
});

module.exports = router;
