import crypto from "crypto";
import User from "../models/User.js";

export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      email,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // Find or create user and mark as verified
    let user = await User.findOne({ email });
    if (user) {
      user.verified          = true;
      user.razorpayPaymentId = razorpay_payment_id;
      user.razorpayOrderId   = razorpay_order_id;
      if (name) user.name    = name;
      await user.save();
    } else {
      user = await User.create({
        name:              name  || "User",
        email:             email || "unknown@email.com",
        verified:          true,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId:   razorpay_order_id,
      });
    }

    res.status(200).json({
      success:   true,
      message:   "Payment verified. Premium access granted.",
      paymentId: razorpay_payment_id,
      userId:    user._id,
      email:     user.email,
    });

  } catch (error) {
    console.error("Verify Payment Error:", error.message);
    next(error);
  }
};
