/**
 * Simple test script for new server modules
 * Run: node test-modules.js
 */

const DataStore = require('./services/DataStore');
const RoomManager = require('./services/RoomManager');

console.log('🧪 Testing new server modules...\n');

// Test 1: DataStore
console.log('1️⃣ Testing DataStore...');
try {
  const testRoomId = 'test-room-' + Date.now();
  
  // Create room
  DataStore.createRoom(testRoomId, {
    name: 'Test Room',
    isPublic: true,
    hasPassword: false
  });
  console.log('  ✅ Room created');
  
  // Get room info
  const roomInfo = DataStore.getRoomInfo(testRoomId);
  console.log('  ✅ Room info retrieved:', roomInfo.name);
  
  // Save strokes
  const testStrokes = [
    { id: '1', type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 }
  ];
  DataStore.saveRoomStrokes(testRoomId, testStrokes);
  console.log('  ✅ Strokes saved');
  
  // Load strokes
  const loadedStrokes = DataStore.loadRoomStrokes(testRoomId);
  console.log('  ✅ Strokes loaded:', loadedStrokes.length);
  
  // Delete room
  DataStore.deleteRoom(testRoomId);
  console.log('  ✅ Room deleted');
  
  console.log('✅ DataStore tests passed!\n');
} catch (error) {
  console.error('❌ DataStore test failed:', error.message);
  process.exit(1);
}

// Test 2: RoomManager
console.log('2️⃣ Testing RoomManager...');
try {
  const testRoomId = 'test-room-' + Date.now();
  
  // Create room in DataStore first
  DataStore.createRoom(testRoomId, {
    name: 'Test Room',
    isPublic: true,
    hasPassword: false
  });
  
  // Mock WebSocket
  const mockWs = {
    readyState: 1,
    send: (data) => {},
    close: () => {}
  };
  
  // Add user
  const room = RoomManager.addUser(testRoomId, 'testuser', mockWs);
  console.log('  ✅ User added to room');
  
  // Get users
  const users = RoomManager.getRoomUsers(testRoomId);
  console.log('  ✅ Users retrieved:', users.length);
  
  // Add stroke
  RoomManager.addStroke(testRoomId, {
    id: '1',
    type: 'line',
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 100
  });
  console.log('  ✅ Stroke added');
  
  // Get strokes
  const strokes = RoomManager.getRoomStrokes(testRoomId);
  console.log('  ✅ Strokes retrieved:', strokes.length);
  
  // Remove user
  RoomManager.removeUser(mockWs);
  console.log('  ✅ User removed');
  
  // Cleanup
  DataStore.deleteRoom(testRoomId);
  
  console.log('✅ RoomManager tests passed!\n');
} catch (error) {
  console.error('❌ RoomManager test failed:', error.message);
  process.exit(1);
}

// Test 3: Statistics
console.log('3️⃣ Testing Statistics...');
try {
  const stats = RoomManager.getStats();
  console.log('  ✅ Stats retrieved:');
  console.log('    - Active rooms:', stats.activeRooms);
  console.log('    - Total users:', stats.totalUsers);
  
  console.log('✅ Statistics tests passed!\n');
} catch (error) {
  console.error('❌ Statistics test failed:', error.message);
  process.exit(1);
}

console.log('🎉 All tests passed successfully!');
console.log('\n📝 Next steps:');
console.log('  1. Test the full server: node index.new.js');
console.log('  2. Test the client with new services');
console.log('  3. Follow REFACTORING_GUIDE.md for migration');

process.exit(0);
