const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(express.static("public"));


const JWT_SECRET = "skillx_secret_2024";

// ===============================
// MongoDB Connection
// ===============================
mongoose.connect("mongodb+srv://anjaliamane22_db_user:AsEK4iTPP8SD8dTM@cluster0.l3pw9wx.mongodb.net/?appName=Cluster0")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ===============================
// Email Configuration
// ===============================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'anjaliamane22@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'hdrm ntec mhls kagg'
  }
});

// ===============================
// User Schema
// ===============================
const UserSchema = new mongoose.Schema({

name: String,
username: String,
email: { type: String, unique: true },
password: String,

phone: String,
bio: String,
interests: String,
location: String,
experience: String,
role: String,
company: String,
skills: String,

photoURL: { type: String, default: '' },

isGoogleUser: { type: Boolean, default: false },

credits: { type: Number, default: 120 },
xp: { type: Number, default: 0 },
streak: { type: Number, default: 0 },
level: { type: Number, default: 1 },

createdAt: { type: Date, default: Date.now }

});

const User = mongoose.model("User", UserSchema);




// ===============================
// Session Schema
// ===============================
const SessionSchema = new mongoose.Schema({
  mentorName: String,
  mentorEmoji: String,
  skill: String,
  date: String,
  time: String,
  duration: Number,
  credits: Number,
  roomId: String,
  sessionDT: Date,
  studentEmail: String,
  studentId: mongoose.Schema.Types.ObjectId,
  status: { type: String, default: 'confirmed' },
  createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', SessionSchema);

// ===============================
// Token Verify Middleware
// ===============================
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
};

// ===============================
// REGISTER API (Email/Password)
// ===============================
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

    console.log("✅ New user registered:", email);

    res.json({
      message: "Account Created Successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        credits: newUser.credits,
        xp: newUser.xp,
        level: newUser.level
      }
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// ===============================
// LOGIN API (Email/Password)
// ===============================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Account not found. Please register first." });
    }

    // Google users ke liye password check skip
    if (user.isGoogleUser) {
      return res.status(400).json({ message: "This account uses Google login. Please sign in with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password. Please try again." });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    console.log("✅ User logged in:", email);

    res.json({
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        xp: user.xp,
        level: user.level
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// ===============================
// FIREBASE SYNC (Google Login) ✅ NEW
// ===============================
app.post("/firebase-sync", async (req, res) => {
  const { uid, name, email, photoURL } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    // Check karo user exist karta hai kya
    let user = await User.findOne({ email });

    if (!user) {
      // Naya Google user banao
      user = new User({
        name: name || "SkillX User",
        email,
        password: await bcrypt.hash(uid, 10), // UID hashed as placeholder
        photoURL: photoURL || "",
        isGoogleUser: true
      });
      await user.save();
      console.log("✅ New Google user created:", email);
    } else {
      // Existing user - photoURL update karo
      if (photoURL && !user.photoURL) {
        await User.findByIdAndUpdate(user._id, { photoURL });
      }
      console.log("✅ Existing user Google login:", email);
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Sync Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        xp: user.xp,
        level: user.level,
        photoURL: user.photoURL
      }
    });

  } catch (error) {
    console.error("Firebase sync error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// ===============================
// GET USER PROFILE
// ===============================
app.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// ===============================
// BOOK SESSION API
// ===============================
app.post('/sessions/book', async (req, res) => {
  try {
    const { mentorName, mentorEmoji, skill, date, time, duration, credits, roomId, sessionDT, studentEmail } = req.body;

    let studentId = null;
    const token = req.headers['authorization'];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        studentId = decoded.id;
        // Credits deduct karo
        await User.findByIdAndUpdate(studentId, { $inc: { credits: -credits } });
      } catch (e) {
        console.log('Token optional for booking');
      }
    }

    const session = new Session({
      mentorName,
      mentorEmoji,
      skill,
      date,
      time,
      duration,
      credits,
      roomId,
      sessionDT: sessionDT ? new Date(sessionDT) : null,
      studentEmail,
      studentId
    });

    const savedSession = await session.save();
    console.log('✅ Session saved:', savedSession._id);

    // Confirmation email bhejo
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillx.com',
      to: studentEmail,
      subject: `✅ Session Confirmed with ${mentorName}`,
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c9a84c, #e8c76a); padding: 30px; border-radius: 12px; text-align: center; color: white;">
            <h1 style="margin: 0;">🎉 Session Booked!</h1>
          </div>
          <div style="padding: 30px; background: #f9f7f4; border-radius: 0 0 12px 12px;">
            <p>Hi there,</p>
            <p>Your session has been successfully booked with <strong>${mentorName}</strong>.</p>
            <div style="background: white; border-left: 4px solid #c9a84c; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p><strong>📅 Date:</strong> ${date}</p>
              <p><strong>🕐 Time:</strong> ${time}</p>
              <p><strong>⏱️ Duration:</strong> ${duration} hour(s)</p>
              <p><strong>💳 Credits Used:</strong> ${credits}</p>
            </div>
            <p>You'll receive a reminder 30 minutes before your session. Be ready! 🚀</p>
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log('❌ Email error:', error);
      else console.log('✅ Email sent to:', studentEmail);
    });

    res.status(201).json({
      success: true,
      message: 'Session booked!',
      session: savedSession,
      roomId: savedSession.roomId
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ===============================
// GET MY SESSIONS
// ===============================
app.get('/sessions/my', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const sessions = await Session.find({
      $or: [{ studentId: decoded.id }, { studentEmail: user.email }]
    }).sort({ createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ===============================
// GET ALL SESSIONS
// ===============================
app.get('/sessions/all', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 }).limit(100);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ===============================
// LEADERBOARD API
// ===============================
app.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ xp: -1 })
      .limit(10)
      .select('name xp credits streak level');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});


// ===============================
// COMPLETE PROFILE API
// ===============================
app.post("/complete-profile", async (req, res) => {

try {

const {
username,
fullName,
email,
phone,
bio,
interests,
location,
experience,
role,
company,
skills,
photo,
certificates
} = req.body;

// user update karo
const user = await User.findOneAndUpdate(
{ email: email },
{
name: fullName,
username: username,
phone: phone,
bio: bio,
interests: interests,
location: location,
experience: experience,
role: role,
company: company,
skills: skills,
photoURL: photo
},
{ returnDocument: "after" }
);

if (!user) {
return res.status(404).json({ message: "User not found" });
}

console.log("✅ Profile completed:", email);

res.json({
success: true,
message: "Profile saved successfully",
user: user
});

} catch (error) {

console.error("Profile save error:", error);

res.status(500).json({
message: "Server Error",
error: error.message
});

}

});

// ===============================
// START SERVER
// ===============================
app.listen(5000, () => {
  console.log("\n🚀 SkillX Server running on http://localhost:5000");
  console.log("✅ MongoDB Connected");
  console.log("📧 Email ready");
  console.log("🔐 Auth routes: /register, /login, /firebase-sync\n");
});

app.get("/profile/:email", async (req,res)=>{

try{

const user = await User.findOne({ email:req.params.email });

res.json(user);

}catch(err){

res.status(500).json({error:"Server error"});

}

});
