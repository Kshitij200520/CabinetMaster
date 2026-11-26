import mongoose, { Schema } from "mongoose";

const LineItemSchema = new Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  widthIn: { type: Number, min: 0, default: 0 },
  quantity: { type: Number, min: 1, required: true },
  unitPriceINR: { type: Number, min: 0, required: true },
  lineTotalINR: { type: Number, min: 0, required: true },
}, { _id: false, strict: true });

const QuoteSchema = new Schema({
  quoteNumber: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  designId: { type: Schema.Types.ObjectId, ref: "Design", default: null },
  designSnapshot: { type: Schema.Types.Mixed, required: true },
  lineItems: { type: [LineItemSchema], required: true },
  subtotalINR: { type: Number, min: 0, required: true },
  discountINR: { type: Number, min: 0, required: true },
  taxableINR: { type: Number, min: 0, required: true },
  gstRate: { type: Number, min: 0, max: 1, required: true },
  gstINR: { type: Number, min: 0, required: true },
  grandTotalINR: { type: Number, min: 0, required: true },
  status: {
    type: String,
    enum: ["Pending Review", "In Consultation", "Approved", "Revision Requested"],
    default: "Pending Review",
    index: true,
  },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: true });

export default mongoose.models.Quote || mongoose.model("Quote", QuoteSchema);
