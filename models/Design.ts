import mongoose, { Schema } from "mongoose";

const CabinetSchema = new Schema({
  id: { type: String, required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  category: { type: String, enum: ["base", "wall", "sink", "drawer", "corner", "pantry"], required: true },
  width: { type: Number, min: 6, max: 120, required: true },
  height: { type: Number, min: 6, max: 120, required: true },
  depth: { type: Number, min: 6, max: 60, required: true },
  quantity: { type: Number, min: 1, max: 50, required: true },
  unitPriceINR: { type: Number, min: 0, required: true },
  position: { type: [Number], required: true },
  wall: { type: String, enum: ["back", "left", "right", "front"], required: true },
  rotation: { type: Number, required: true },
}, { _id: false, strict: true });

const DesignSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  layout: { type: String, enum: ["straight", "l", "u", "galley"], required: true },
  dimensions: {
    lengthIn: { type: Number, required: true },
    widthIn: { type: Number, required: true },
    wallHeightIn: { type: Number, required: true },
    ceilingHeightIn: { type: Number, required: true },
  },
  doorStyle: { type: String, required: true },
  finish: { type: String, required: true },
  color: { type: String, required: true },
  countertop: { type: String, required: true },
  backsplash: { type: String, required: true },
  handle: { type: String, required: true },
  cabinets: { type: [CabinetSchema], required: true, validate: [(items: unknown[]) => items.length <= 40, "Too many cabinets."] },
  config: { type: Schema.Types.Mixed, required: true },
  previewImage: { type: String, default: "" },
  aiRenderImage: { type: String, default: "" },
  estimatedTotalINR: { type: Number, min: 0, required: true },
}, { timestamps: true, strict: true });

export default mongoose.models.Design || mongoose.model("Design", DesignSchema);
