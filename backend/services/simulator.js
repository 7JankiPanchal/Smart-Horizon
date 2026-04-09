const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

const INDIAN_NAMES = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Kabir', 'Rohan', 'Karan', 'Sneha', 'Ananya', 'Priya', 'Riya', 'Aisha', 'Kavya', 'Neha', 'Pooja', 'Vikram', 'Raj', 'Rahul', 'Amit', 'Sunil', 'Kishore', 'Ramesh', 'Sanjay', 'Manish'];
const INDIAN_SURNAMES = ['Sharma', 'Verma', 'Singh', 'Patel', 'Reddy', 'Kumar', 'Kapoor', 'Gupta', 'Iyer', 'Menon', 'Nair', 'Desai', 'Jain', 'Bose', 'Chatterjee', 'Das'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Pune', 'Surat'];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function generateAccount() { return Math.random().toString().slice(2, 12); }
function generateIPv4() { return `${getRandomInt(1,255)}.${getRandomInt(0,255)}.${getRandomInt(0,255)}.${getRandomInt(0,255)}`; }

async function createIndianUser() {
  const name = `${getRandom(INDIAN_NAMES)} ${getRandom(INDIAN_SURNAMES)}`;
  const email = `${name.replace(' ', '.').toLowerCase()}${getRandomInt(10,99)}@gmail.com`;
  
  // We will re-use existing user if they exist to avoid unique constraint errors
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      accountNumber: generateAccount(),
      kycStatus: 'verified',
    });
  }
  return user;
}

const sendTx = async (payload) => {
  try {
    await axios.post(`${API_URL}/transactions`, payload);
  } catch (err) {
    if (err.response) console.error(`[Sim] Failed ${payload.type}:`, err.response.data);
  }
};

/**
 * Executes a completely random benign Indian transaction.
 */
async function triggerSafeScenario() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  const amount = getRandomInt(100, 4800); // Small standard amounts
  
  console.log(`🟢 [Safe] ${sender.name} -> ${receiver.name} (₹${amount})`);
  await sendTx({
    sender: sender._id, receiver: receiver._id, amount,
    type: getRandom(['upi', 'imps']),
    location: { city: getRandom(CITIES), country: 'IN' },
    currency: 'INR',
    ipAddress: generateIPv4(),
    deviceFingerprint: sender._id.toString() // Standard device
  });
}

/**
 * 1. Machine Gun
 */
async function triggerMachineGun() {
  const sender = await createIndianUser();
  console.log(`💥 [Rule 1] Triggering Machine Gun for ${sender.name}...`);
  for (let i=0; i<3; i++) {
    const rx = await createIndianUser();
    sendTx({
      sender: sender._id, receiver: rx._id, amount: getRandomInt(100, 500),
      type: 'upi', location: { city: getRandom(CITIES), country: 'IN' }, currency: 'INR'
    });
  }
}

/**
 * 2. PAN Dodge Structuring
 */
async function triggerStructuring() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  const amounts = [49999, 199999, 49500, 199500];
  const amount = getRandom(amounts);
  console.log(`🐀 [Rule 2] Triggering PAN Dodge for ${sender.name} -> ₹${amount}`);
  sendTx({
    sender: sender._id, receiver: receiver._id, amount,
    type: 'bank_transfer', location: { city: getRandom(CITIES), country: 'IN' }, currency: 'INR'
  });
}

/**
 * 3. Penny Drop -> Drain
 */
async function triggerPennyDrop() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  console.log(`🪙 [Rule 3] Sending ₹1 from ${sender.name}...`);
  await sendTx({
    sender: sender._id, receiver: receiver._id, amount: 1, type: 'upi',
    location: { city: 'Mumbai', country: 'IN' }, currency: 'INR'
  });
  
  setTimeout(async () => {
    console.log(`🏦 [Rule 3] Draining ₹25,000 from ${sender.name}!`);
    await sendTx({
      sender: sender._id, receiver: receiver._id, amount: 25000, type: 'imps',
      location: { city: 'Mumbai', country: 'IN' }, currency: 'INR'
    });
  }, 2000);
}

/**
 * 4. Midnight Ghost
 */
async function triggerMidnightGhost() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  // We fake the timestamp directly in the payload
  const fakeDate = new Date();
  // Subtracting 4-5 hours to forcefully put it right into the middle of the Indian night
  fakeDate.setHours(fakeDate.getHours() - 5); 
  
  console.log(`👻 [Rule 4] Midnight Ghost transfer ₹30,000 from ${sender.name}`);
  sendTx({
    sender: sender._id, receiver: receiver._id, amount: 30000, type: 'wire',
    location: { city: getRandom(CITIES), country: 'IN' }, currency: 'INR',
    timestamp: fakeDate.toISOString()
  });
}

/**
 * 5. Impossible Travel
 */
async function triggerImpossibleTravel() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  
  console.log(`✈️  [Rule 5] Swipe in Mumbai for ${sender.name}`);
  await sendTx({
    sender: sender._id, receiver: receiver._id, amount: 500, type: 'card',
    location: { city: 'Mumbai', country: 'IN' }, currency: 'INR',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString() // 30 minutes ago
  });
  
  setTimeout(async () => {
    console.log(`✈️  [Rule 5] Second Swipe in Delhi for ${sender.name} (Impossible!)`);
    await sendTx({
      sender: sender._id, receiver: receiver._id, amount: 500, type: 'card',
      location: { city: 'Delhi', country: 'IN' }, currency: 'INR'
    });
  }, 1000);
}

/**
 * 6. Clean Sweep Limit Maxout
 */
async function triggerCleanSweep() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  const amount = getRandomInt(95000, 100000); // Drain limit
  console.log(`🧹 [Rule 6] Clean Sweep ₹${amount} from ${sender.name}`);
  sendTx({
    sender: sender._id, receiver: receiver._id, amount,
    type: 'upi', location: { city: getRandom(CITIES), country: 'IN' }, currency: 'INR'
  });
}

/**
 * 7. New Device Logins
 */
async function triggerNewDevice() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  const newFingerprint = "NEW_DEVICE_" + generateAccount();
  const amount = getRandomInt(10000, 20000);
  console.log(`📱 [Rule 7] New Device Login executing ₹${amount}`);
  sendTx({
    sender: sender._id, receiver: receiver._id, amount, type: 'imps',
    location: { city: getRandom(CITIES), country: 'IN' }, currency: 'INR',
    deviceFingerprint: newFingerprint
  });
}

/**
 * 8. Suspicious Round Numbers
 */
async function triggerRoundNumbers() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  const amount = getRandom([20000, 50000]); 
  console.log(`🛑 [Rule 8] Suspicious Round Number ₹${amount}`);
  sendTx({
    sender: sender._id, receiver: receiver._id, amount,
    type: 'rtgs', location: { city: getRandom(CITIES), country: 'IN' }, currency: 'INR'
  });
}

/**
 * 9. Foreign IP, Domestic Acc
 */
async function triggerForeignIP() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  // 194.55.x.x is a flagged Russian range in our agent
  const russianIp = `194.55.${getRandomInt(1, 255)}.${getRandomInt(1, 255)}`;
  console.log(`🌍 [Rule 9] Foreign IP (${russianIp}) on Indian App`);
  sendTx({
    sender: sender._id, receiver: receiver._id, amount: 5000,
    type: 'bank_transfer', location: { city: 'Unknown', country: 'IN' }, currency: 'INR',
    ipAddress: russianIp
  });
}

/**
 * 10. Brute Force
 */
async function triggerBruteForce() {
  const sender = await createIndianUser();
  const receiver = await createIndianUser();
  console.log(`🔨 [Rule 10] Brute forcing PIN for ${sender.name}`);
  
  // Directly emitting two immediate failures (bypasses Agent inside normal routing)
  await sendTx({ sender: sender._id, receiver: receiver._id, amount: 20000, type: 'upi', status: 'failed', currency: 'INR' });
  await sendTx({ sender: sender._id, receiver: receiver._id, amount: 15000, type: 'upi', status: 'failed', currency: 'INR' });
  
  setTimeout(async () => {
    console.log(`🔨 [Rule 10] PIN found! Stealing ₹10000`);
    await sendTx({
      sender: sender._id, receiver: receiver._id, amount: 10000, type: 'upi',
      location: { city: getRandom(CITIES), country: 'IN' }, currency: 'INR'
    });
  }, 1000);
}


async function startSimulator() {
  console.log('🤖 Starting Indian Threat Scenario Simulator...');
  
  // Prepare an array of behaviors
  const scenarios = [
    triggerSafeScenario, triggerSafeScenario, triggerSafeScenario, triggerSafeScenario, 
    triggerSafeScenario, triggerSafeScenario, triggerSafeScenario, triggerSafeScenario,
    triggerSafeScenario, triggerSafeScenario, triggerSafeScenario, triggerSafeScenario,
    triggerSafeScenario, triggerSafeScenario, triggerSafeScenario, triggerSafeScenario,
    triggerSafeScenario, triggerSafeScenario, triggerSafeScenario, triggerSafeScenario,
    triggerSafeScenario, triggerSafeScenario, triggerSafeScenario, triggerSafeScenario,
    triggerMachineGun, triggerStructuring, triggerPennyDrop, 
    triggerMidnightGhost, triggerImpossibleTravel, triggerCleanSweep, 
    triggerNewDevice, triggerRoundNumbers, triggerForeignIP, triggerBruteForce
  ];

  const loop = async () => {
    const act = getRandom(scenarios);
    await act();
    const nextDelay = getRandomInt(1000, 3000); // Every 1 to 3 seconds for liveliness
    setTimeout(loop, nextDelay);
  };

  loop();
}

module.exports = { startSimulator };
