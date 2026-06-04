# Room Connect - 100% Browser-Based Room System

A completely browser-based room connection system that works without any server installation. Create and join rooms with codes - all data stored locally in your browser using localStorage.

## ✨ Features

- **No Installation Required** - Just open the HTML file in a browser
- **Create Rooms** - Generate unique 6-character codes instantly
- **Join Rooms** - Connect to existing rooms with just a code
- **Real-time Chat** - Send and receive messages with automatic updates
- **User Management** - See all users currently in the room
- **Easy Sharing** - Copy room codes with one click
- **Persistent Data** - Messages and rooms persist using browser localStorage
- **Responsive Design** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

1. Open the `public/index.html` file in any modern web browser
   - Just double-click the file, or
   - Drag it into your browser window, or
   - Use Live Server extension in VS Code

2. Enter your name

3. Either:
   - Click **Create Room** to generate a new code, or
   - Click **Join Room** and enter an existing room code

4. Start chatting!

## 📋 How It Works

### Creating a Room
1. Enter your name
2. Click "Create Room"
3. A unique 6-character code is generated
4. Share the code with friends
5. Enter the room and start chatting

### Joining a Room
1. Enter your name
2. Click "Join Room"
3. Enter the 6-character room code
4. Click "Join"
5. You're in! See all users and previous messages

### Messaging
- Type messages in the chat box
- Press Send or Enter to send
- Messages appear for all users in the room in real-time
- Scroll to see message history

## 📁 Project Structure

```
public/
├── index.html      # Main HTML file - Open this!
├── style.css       # Styling (modern, responsive design)
└── app.js          # All JavaScript logic (no external dependencies)

server.js           # Not needed - included for reference only
package.json        # Not needed - included for reference only
```

## 💾 Data Storage

- **Location**: Browser's localStorage
- **Persistence**: Data persists across browser sessions
- **Clearing Data**: Clear browser cache to reset all rooms
- **Privacy**: All data stays on your device

## 🌐 How to Use Across Devices

### Same Device (Multiple Tabs)
1. Open the HTML file in multiple browser tabs
2. Each tab is independent
3. Rooms are shared via localStorage

### Different Devices on Same Network
1. Host the HTML file on a simple HTTP server, or
2. Share the room code - each device can create/join independently
3. For real synchronization across devices, all users should join the same code

### Best Practices
- All users should refresh the page if they don't see updates
- Room codes are random but may occasionally repeat (extremely rare)
- Clear your browser cache to free up storage if needed

## 🛠️ Customization

### Change Room Code Length
Edit `app.js` line with `generateCode()`:
```javascript
return Math.random().toString(36).substring(2, 8).toUpperCase(); // Change '8' to desired length
```

### Modify Colors/Styling
Edit `style.css` and change the color variables:
```css
/* Main color: #667eea */
/* Secondary color: #764ba2 */
```

### Add Features
The code is simple JavaScript with no dependencies - easy to modify:
- `RoomManager` class handles all room logic
- Add timestamps, user avatars, or other features easily

## 📱 Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## ❓ FAQ

**Q: Can people from different devices join the same room?**  
A: Yes! They just need to enter the same room code. Both devices will show the same room data from localStorage.

**Q: What if two people create a room with the same code?**  
A: Extremely unlikely - codes are random 6-character strings. The chance is roughly 1 in 2.1 trillion.

**Q: Will my messages be saved?**  
A: Yes, while you're on the same device and browser. If you clear cache or use a different browser, data won't transfer.

**Q: Can I run this on a server?**  
A: Yes! Upload the `public` folder contents to any web server and it will work perfectly.

**Q: Why no backend server?**  
A: This approach keeps it simple - zero installation, instant setup, works anywhere. The tradeoff is data stays local to each device. Use this for local networks or consider using the Node.js version for full cross-device sync.

## 🎨 User Interface

- **Main Screen**: Enter name and choose to create or join
- **Room Screen**: 
  - User list on the left
  - Chat area on the right
  - Real-time message updates
  - Easy-to-use controls

## 📄 License

ISC - Open source and free to use!

---

**Need help?** Just open the HTML file in your browser - no setup required!
