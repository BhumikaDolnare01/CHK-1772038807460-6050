import Razorpay from "razorpay";

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount:   900,        // ₹9 in paise (900 paise = ₹9)
      currency: "INR",      // ← changed from USD to INR (Razorpay India requires INR)
      receipt:  "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
    });

  } catch (error) {
    console.error("Payment Order Error:", error.message);
    next(error);
  }
};
