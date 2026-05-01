require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const allUsers = [
  { name: "Amit Sharma", email: "amit@redapple.com", password: "admin123", role: "admin" },
  { name: "Soumya Saha", email: "soumya@redapple.com", password: "marketing123", role: "marketing_manager" },
  { name: "Shreya Chakraborty", email: "shreya@redapple.com", password: "telecaller123", role: "telecaller" },
  { name: "Priya Das", email: "priya@redapple.com", password: "telecaller123", role: "telecaller" },
  { name: "Manjari Chakraborty", email: "manjari@redapple.com", password: "counselor123", role: "counselor" },
  { name: "Vikram Singh", email: "vikram@redapple.com", password: "manager123", role: "telecalling_manager" },
  { name: "Rajesh Kapoor", email: "rajesh@redapple.com", password: "owner123", role: "owner" },
  { name: "Rohit Banerjee", email: "rohit@redapple.com", password: "alliance123", role: "alliance_manager" },
  { name: "Sneha Roy", email: "sneha@redapple.com", password: "alliance123", role: "alliance_executive" },
  { name: "Karan Mehta", email: "karan@redapple.com", password: "alliance123", role: "alliance_executive" },
  { name: "Pooja Nair", email: "pooja@redapple.com", password: "alliance123", role: "alliance_executive" },
  { name: "Neha Gupta", email: "neha@redapple.com", password: "accounts123", role: "accounts_manager" },
  { name: "Arjun Patel", email: "arjun@redapple.com", password: "accounts123", role: "accounts_executive" },
];

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("MONGO_URI is not set. Skipping seed.");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("Connected to MongoDB...");

    await User.deleteMany({});
    console.log("Cleared existing users.");

    await User.insertMany(allUsers);
    console.log(`Seeded ${allUsers.length} users successfully!`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
}

seed();
