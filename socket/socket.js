const io = require("socket.io")(5000, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let users = [];
let activeCalls = new Map();

const addOnlineUser = (user, socketId) => {
  const existingUserIndex = users.findIndex((u) => u.user._id === user._id);
  
  if (existingUserIndex !== -1) {
    // ✅ Eski socketId ni disconnect qilish
    const oldSocketId = users[existingUserIndex].socketId;
    if (oldSocketId !== socketId) {
      console.log(`🔄 Updating user ${user._id} socket: ${oldSocketId} → ${socketId}`);
    }
    users[existingUserIndex].socketId = socketId;
  } else {
    console.log(`➕ Adding new user: ${user._id} with socket: ${socketId}`);
    users.push({ user, socketId });
  }
};

const getSocketId = (userId) => {
  const user = users.find(
    (u) =>
      u.user._id === userId ||
      String(u.user._id) === String(userId) ||
      u.user._id.toString() === userId.toString()
  );
  
  if (user) {
    console.log(`🔍 Found socket for user ${userId}: ${user.socketId}`);
  } else {
    console.log(`❌ Socket NOT found for user ${userId}`);
    console.log(`📋 Online users:`, users.map(u => ({ id: u.user._id, socket: u.socketId })));
  }
  
  return user ? user.socketId : null;
};

const generateCallId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Add online user
  socket.on("addOnlineUser", (user) => {
    console.log("👤 Adding online user:", user._id, "Socket:", socket.id);
    addOnlineUser(user, socket.id);
    io.emit("getOnlineUsers", users);
  });

  // Call Request
  socket.on("callRequest", ({ caller, receiver, callType }) => {
    console.log(`📞 Call request: ${caller._id} → ${receiver._id} (${callType})`);

    const receiverSocketId = getSocketId(receiver._id);
    const callId = generateCallId();

    if (receiverSocketId) {
      activeCalls.set(callId, {
        caller,
        receiver,
        type: callType,
        status: "ringing",
        startTime: new Date(),
        callerSocketId: socket.id,
        receiverSocketId: receiverSocketId,
      });

      console.log(`✅ Call ${callId} created. Caller socket: ${socket.id}, Receiver socket: ${receiverSocketId}`);

      // Send callId to caller
      socket.emit("callRequestSent", { callId });

      // Send incoming call to receiver
      io.to(receiverSocketId).emit("incomingCall", {
        callId,
        caller,
        callType,
      });

      console.log(`📤 Incoming call sent to receiver ${receiver._id}`);
    } else {
      console.error(`❌ Receiver ${receiver._id} not found online`);
      socket.emit("callFailed", { reason: "User is offline" });
    }
  });

  // Call Accepted
  socket.on("callAccepted", ({ callId, receiver }) => {
    console.log(`✅ Call accepted: ${callId}`);

    const call = activeCalls.get(callId);
    if (call) {
      call.status = "connected";
      call.acceptedAt = new Date();

      console.log(`📤 Notifying caller (${call.callerSocketId}) and receiver (${call.receiverSocketId})`);

      // Notify caller
      io.to(call.callerSocketId).emit("callAccepted", {
        callId,
        receiver: call.receiver,
      });

      // Notify receiver
      io.to(call.receiverSocketId).emit("callAccepted", {
        callId,
        receiver: call.caller,
      });

      console.log(`✅ Both parties notified about call acceptance`);
    } else {
      console.error(`❌ Call ${callId} not found in activeCalls`);
    }
  });

  // WebRTC Signaling - IMPROVED
  socket.on("offer", ({ callId, offer, targetUserId }) => {
    console.log(`📤 Forwarding offer for call ${callId} to user ${targetUserId}`);
    
    const call = activeCalls.get(callId);
    const targetSocketId = getSocketId(targetUserId);

    if (targetSocketId) {
      io.to(targetSocketId).emit("offer", {
        callId,
        offer,
        fromUserId: socket.id,
      });
      console.log(`✅ Offer forwarded to socket ${targetSocketId}`);
    } else {
      console.error(`❌ Target user ${targetUserId} socket not found`);
      
      if (call) {
        console.log(`📋 Call info - Caller: ${call.callerSocketId}, Receiver: ${call.receiverSocketId}`);
      }
    }
  });

  socket.on("answer", ({ callId, answer, targetUserId }) => {
    console.log(`📤 Forwarding answer for call ${callId} to user ${targetUserId}`);
    
    const targetSocketId = getSocketId(targetUserId);

    if (targetSocketId) {
      io.to(targetSocketId).emit("answer", {
        callId,
        answer,
        fromUserId: socket.id,
      });
      console.log(`✅ Answer forwarded to socket ${targetSocketId}`);
    } else {
      console.error(`❌ Target user ${targetUserId} socket not found`);
    }
  });

  socket.on("iceCandidate", ({ callId, candidate, targetUserId }) => {
    const targetSocketId = getSocketId(targetUserId);

    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", {
        callId,
        candidate,
        fromUserId: socket.id,
      });
      console.log(`🧊 ICE candidate forwarded to ${targetUserId} (${targetSocketId})`);
    } else {
      console.error(`❌ Cannot forward ICE - Target user ${targetUserId} not found`);
    }
  });

  // Call Rejected
  socket.on("callRejected", ({ callId, receiver, reason }) => {
    console.log(`❌ Call rejected: ${callId}, Reason: ${reason}`);
    const call = activeCalls.get(callId);

    if (call) {
      const callerSocketId = call.callerSocketId;
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected", {
          callId,
          receiver,
          reason,
        });
        console.log(`📤 Call rejection sent to caller (${callerSocketId})`);
      }
      activeCalls.delete(callId);
    }
  });

  // Call Ended
  socket.on("callEnded", ({ callId, targetUserId, reason }) => {
    console.log(`🔴 Call ended: ${callId}, Reason: ${reason}`);
    const targetSocketId = getSocketId(targetUserId);

    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded", { callId, reason });
      console.log(`📤 Call end notification sent to ${targetUserId} (${targetSocketId})`);
    }
    
    activeCalls.delete(callId);
  });

  // Message handlers
  socket.on("createContact", ({ currentUser, receiver }) => {
    const receiverSocketId = getSocketId(receiver._id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getCreatedUser", currentUser);
    }
  });

  socket.on("sendMessage", ({ newMessage, receiver, sender }) => {
    const receiverSocketId = getSocketId(receiver._id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getNewMessage", {
        newMessage,
        sender,
        receiver,
      });
    }
  });

  socket.on("readMessages", ({ receiver, messages }) => {
    const receiverSocketId = getSocketId(receiver._id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getReadMessages", messages);
    }
  });

  socket.on("updateMessage", ({ updatedMessage, receiver, sender }) => {
    const receiverSocketId = getSocketId(receiver._id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getUpdatedMessage", {
        updatedMessage,
        sender,
        receiver,
      });
    }
  });

  socket.on(
    "deleteMessage",
    ({ deletedMessage, filteredMessages, sender, receiver }) => {
      const receiverSocketId = getSocketId(receiver._id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("getDeletedMessage", {
          deletedMessage,
          sender,
          filteredMessages,
        });
      }
    }
  );

  socket.on("typing", ({ receiver, sender, message }) => {
    const receiverSocketId = getSocketId(receiver._id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getTyping", { sender, message });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    const disconnectedUser = users.find((u) => u.socketId === socket.id);

    if (disconnectedUser) {
      console.log(`👤 User ${disconnectedUser.user._id} disconnected`);
      
      // End all active calls for this user
      for (const [callId, call] of activeCalls.entries()) {
        if (
          call.callerSocketId === socket.id ||
          call.receiverSocketId === socket.id
        ) {
          const otherSocketId = 
            call.callerSocketId === socket.id 
              ? call.receiverSocketId 
              : call.callerSocketId;

          if (otherSocketId) {
            io.to(otherSocketId).emit("callEnded", {
              callId,
              reason: "User disconnected",
            });
            console.log(`📤 Call ${callId} ended due to disconnect`);
          }

          activeCalls.delete(callId);
        }
      }
    }

    users = users.filter((u) => u.socketId !== socket.id);
    io.emit("getOnlineUsers", users);
  });
});

console.log("🚀 Socket.IO server running on port 5000");