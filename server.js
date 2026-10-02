
//  WiFi Package Server

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

// WEBSOCKET IMPLEMENTATION 

// Step 1: Import the WebSocket library
const WebSocket = require('ws');

// Step 2: Create the HTTP server (so Express + WebSocket share the same port)
const app = express();
const server = http.createServer(app);

// Step 3: Create the WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ server });

//confirm the websocket server is ready
console.log("WebSocket server is ready");

// Step 4: When a new client connects (Student or Admin)
wss.on('connection', function connection(ws) {
  console.log("A new client connected via WebSocket");

  // Optional welcome
  ws.send(JSON.stringify({
    type: "WELCOME",
    message: "Connected to the live server"
  }));

  // Step 5: When this client sends a message
  ws.on('message', function incoming(rawMessage) {
    try {
      const data = JSON.parse(rawMessage);

      // Admin is sending a predefined message to all students
      if (data.type === "ADMIN_MESSAGE") {
        console.log("Admin is broadcasting message:", data.message);

        // Broadcast the message to ALL connected clients
        broadcast({
          type: "ADMIN_MESSAGE",
          message: data.message
        });
      }
    } catch (err) {
      console.log("Received non-JSON message:", rawMessage.toString());
    }
  });

  // Step 6: When this client disconnects
  ws.on('close', function () {
    console.log("A client disconnected");
  });

  // Step 7: Error handling
  ws.on('error', function (error) {
    console.error("WebSocket error:", error);
  });
});

// Helper: Send data to every connected WebSocket client
function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// ---------- Simple in-memory database ----------
let packages = [
  { id: 1, name: "1 Day Pass",   price: 50,  duration: "24 hours" },
  { id: 2, name: "7 Days Pass",  price: 250, duration: "7 days" },
  { id: 3, name: "30 Days Pass", price: 800, duration: "30 days" }
];

let purchases = [];


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// ---------- REST API ----------

// Get all packages
app.get('/api/packages', (req, res) => {
  res.json(packages);
});

// Create a new purchase + generate voucher
app.post('/api/purchase', (req, res) => {
  const { studentName, studentId, packageId } = req.body;

  if (!studentName || !studentId || !packageId) {
    return res.status(400).json({ error: "Missing information" });
  }

  const selectedPackage = packages.find(p => p.id === Number(packageId));
  if (!selectedPackage) {
    return res.status(404).json({ error: "Package not found" });
  }

  // Generate a random dummy voucher
  const voucher = "WIFI-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const newPurchase = {
    id: Date.now(),
    studentName,
    studentId,
    packageName: selectedPackage.name,
    price: selectedPackage.price,
    duration: selectedPackage.duration,
    voucher: voucher,                    
    purchasedAt: new Date().toLocaleString()
  };

  purchases.unshift(newPurchase);

  // Notify all Admin pages in real-time
  broadcast({
    type: "NEW_PURCHASE",
    purchase: newPurchase
  });

  // Send success response back to the student
  res.json({
    success: true,
    message: "Purchase successful!",
    purchase: newPurchase
  });
});

// Get all purchases (for admin page first load)
app.get('/api/purchases', (req, res) => {
  res.json(purchases);
});


// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Student page → /`);
  console.log(`Admin page   → /admin.html`);
});