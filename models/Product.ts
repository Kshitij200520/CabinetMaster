import mongoose, { Schema } from "mongoose";

const ProductSchema = new Schema({
  sku: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: ["base", "wall", "sink", "drawer", "corner", "pantry"], required: true },
  widthIn: { type: Number, min: 6, max: 120, required: true },
  heightIn: { type: Number, min: 6, max: 120, required: true },
  depthIn: { type: Number, min: 6, max: 60, required: true },
  basePriceINR: { type: Number, min: 0, required: true },
  active: { type: Boolean, default: true, required: true },
}, { timestamps: true, strict: true });

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
