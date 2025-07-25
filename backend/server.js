import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { User, Review } from "./models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/bookreviews";
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({ dest: "uploads/" });

mongoose.connect(MONGO_URL);

// --- Helpers ---
function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// --- Auth ---
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ message: "Email exists" });
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hash });
  const token = jwt.sign({ id: user._id, email }, JWT_SECRET);
  res.json({ token });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });
  if (!(await bcrypt.compare(password, user.password)))
    return res.status(400).json({ message: "Invalid password" });
  const token = jwt.sign({ id: user._id, email }, JWT_SECRET);
  res.json({ token });
});

// --- Reviews ---
app.get("/api/reviews", auth, async (req, res) => {
  const reviews = await Review.find().populate("user", "email").sort({ createdAt: -1 });
  res.json(reviews);
});

app.get("/api/reviews/:id", auth, async (req, res) => {
  const review = await Review.findById(req.params.id).populate("user", "email");
  if (!review) return res.status(404).json({ message: "Not found" });
  res.json(review);
});

app.post("/api/reviews", auth, upload.single("image"), async (req, res) => {
  const { title, description } = req.body;
  const image = req.file ? req.file.filename : null;
  const review = await Review.create({
    user: req.user.id,
    title,
    description,
    image,
  });
  res.json({ id: review._id });
});

app.put("/api/reviews/:id", auth, upload.single("image"), async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: "Not found" });
  if (review.user.toString() !== req.user.id)
    return res.status(403).json({ message: "Not allowed" });

  let image = review.image;
  if (req.file) {
    // Remover imagem antiga
    if (image) {
      try {
        fs.unlinkSync(path.join(__dirname, "uploads", image));
      } catch {}
    }
    image = req.file.filename;
  }

  review.title = req.body.title;
  review.description = req.body.description;
  review.image = image;
  await review.save();
  res.json({ ok: true });
});

app.delete("/api/reviews/:id", auth, async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: "Not found" });
  if (review.user.toString() !== req.user.id)
    return res.status(403).json({ message: "Not allowed" });
  if (review.image) {
    try {
      fs.unlinkSync(path.join(__dirname, "uploads", review.image));
    } catch {}
  }
  await Review.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => console.log("API running at http://0.0.0.0:" + PORT));
