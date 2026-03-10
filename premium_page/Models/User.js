import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true },
  verified:          { type: Boolean, default: false },
  razorpayPaymentId: { type: String, default: null },
  razorpayOrderId:   { type: String, default: null },
  createdAt:         { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
