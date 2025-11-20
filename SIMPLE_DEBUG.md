# Simple Debugging Commands

## Quick Debug (Paste into Console)

```javascript
// Check socket status
console.log('Socket:', window.debugSocket?.connected ? '✅ Connected' : '❌ Disconnected');
console.log('Socket ID:', window.debugSocket?.id);
console.log('User ID:', window.debugMessaging?.getCurrentUserId?.());

// Manually listen for ALL socket events
if (window.debugSocket) {
  window.debugSocket.onAny((event, ...args) => {
    console.log('🔔 ANY EVENT:', event, args);
  });
  console.log('✅ Now listening for ALL socket events');
}

// Check if socket is in rooms
if (window.debugSocket && window.debugSocket._callbacks) {
  console.log('Registered listeners:', Object.keys(window.debugSocket._callbacks['$'].events || {}));
}
```

## Test Message Send Event
When you send a message, check:
1. Frontend console: Should see `📤 Socket emit: typing` and `📤 Socket emit: message`
2. Backend console: Should see `📤 Emitting socket events...` and `📤 Recipient sockets in room: X`
3. Receiver console: Should see `🔔 NEW_MESSAGE event received!`

If step 3 is missing, the issue is the socket room matching.

