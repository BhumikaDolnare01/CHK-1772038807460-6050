import User from "../models/User.js";

export const checkPremium = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success:  false,
        verified: false,
        message:  "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success:  true,
        verified: false,
        message:  "User not found",
      });
    }

    res.status(200).json({
      success:  true,
      verified: user.verified,
      name:     user.name,
      email:    user.email,
    });

  } catch (error) {
    console.error("Check Premium Error:", error.message);
    next(error);
  }
};
