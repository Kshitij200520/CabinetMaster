import mongoose, { Schema } from "mongoose";

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  pinCode: { type: String, required: true },
  message: String,
}, { timestamps: true });

const LeadSchema = new Schema({
  quoteReference: { type: String, required: true, unique: true, index: true },
  customer: { type: CustomerSchema, required: true },
  design: { type: Schema.Types.Mixed, required: true },
  quote: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["pending", "reviewed", "confirmed", "closed"], default: "pending", index: true },
}, { timestamps: true });

export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
