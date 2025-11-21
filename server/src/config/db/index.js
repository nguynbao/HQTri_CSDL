const mongoose = require("mongoose");
const Ticket = require("../../app/models/Ticket");

// Preferred URI order: env override -> local standalone -> local replica (rs0)
const uriCandidates = [
  process.env.MONGODB_URI,
  "mongodb://127.0.0.1:27018/?replicaSet=rs0",
].filter(Boolean);

async function connect() {
  let connected = false;
  for (const uri of uriCandidates) {
    try {
      console.log("Connecting to:", uri);
      await mongoose.connect(uri);
      await Ticket.syncIndexes();
      console.log("Connected successfully");
      connected = true;
      break;
    } catch (error) {
      console.log("Connection failed:", error.message);
    }
  }

  if (!connected) {
    throw new Error(
      "Unable to connect to any MongoDB URI. Please check your Mongo instance."
    );
  }
}

module.exports = { connect };
