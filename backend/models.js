import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
});

const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  description: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model("User", UserSchema);
export const Review = mongoose.model("Review", ReviewSchema);
