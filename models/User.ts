import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: "", maxlength: 20 },
  city: { type: String, default: "", maxlength: 80 },
  role: { type: String, enum: ["customer", "admin"], default: "customer", required: true },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);
