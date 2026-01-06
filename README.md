# 📱 Gap

A full-featured Gap with real-time messaging Socket.IO, and Next.js.

## ✨ Features

### 💬 Messaging

- **Real-time messaging** - Instant message delivery via Socket.IO
- **Message status** - Sent, delivered, read indicators
- **Message reactions** - React to messages with emojis
- **Message editing** - Edit sent messages
- **Message deletion** - Delete messages
- **Typing indicators** - Show when someone is typing
- **Message search** - Search through messages

### 👥 User Management

- **User authentication** - Secure login with NextAuth.js
- **Contact management** - Add/remove contacts
- **Online status** - See who's online/offline
- **User profiles** - Manage user information

### 🎨 UI/UX

- **Modern design** - Beautiful interface with Tailwind CSS
- **Responsive layout** - Works on all devices
- **Dark/Light mode** - Theme switching
- **Real-time updates** - Instant UI updates
- **Sound notifications** - Audio alerts

## 🚀 Tech Stack

### Frontend

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time communication
- **NextAuth.js** - Authentication
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens

### Real-time Communication

- **Socket.IO** - Real-time messaging
- **STUN servers** - NAT traversal

## 📁 Project Structure

```
Gap/
├── client/                 # Frontend (Next.js)
│   ├── app/               # App router
│   ├── components/        # React components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utility functions
│   ├── types/            # TypeScript types
│   └── http/             # API client
├── server/                # Backend API
│   ├── controllers/       # Route controllers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middlewares/      # Express middlewares
│   └── app.js            # Main server file
├── socket/                # Socket.IO server
│   └── socket.js         # Real-time logic
└── README.md              # Project documentation
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn

### 1. the repository

```bash
git  https://github.com/oscar-bek/Gap.git
cd Gap
```

### 2. Install dependencies

```bash
# Client dependencies
cd client
npm install

# Server dependencies
cd ../server
npm install

# Socket server dependencies
cd ../socket
npm install
```

### 3. Set up environment variables

#### Client (.env.local)

```bash
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

#### Server (.env)

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/Gap
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
```

### 4. Start the database

```bash
# Start MongoDB
mongod
```

### 5. Start the project

```bash
# Terminal 1: Socket server
cd socket
npm start

# Terminal 2: Backend API
cd server
npm start

# Terminal 3: Frontend
cd client
npm run dev
```

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/contacts` - Get contacts list
- `POST /api/user/contact` - Add new contact

### Messages

- `GET /api/user/messages/:contactId` - Get messages
- `POST /api/user/message` - Send message
- `PUT /api/user/message/:id` - Edit message
- `DELETE /api/user/message/:id` - Delete message
- `POST /api/user/message-read` - Mark message as read

## 🔌 Socket Events

### Client to Server

- `addOnlineUser` - Add online user
- `sendMessage` - Send message
- `typing` - Indicate typing
- `callRequest` - Send call request
- `callAccepted` - Accept call
- `callRejected` - Reject call
- `callEnded` - End call

### Server to Client

- `getOnlineUsers` - Get online users list
- `getNewMessage` - Receive new message
- `getTyping` - Get typing indicator
- `incomingCall` - Receive incoming call
- `callAccepted` - Call accepted
- `callRejected` - Call rejected
- `callEnded` - Call ended

## 📱 Usage

### 1. Authentication

- Register a new account or login
- Complete your profile information

### 2. Add contacts

- Go to "Add Contact" section
- Enter the email address
- Start chatting once contact is added

### 3. Send messages

- Select a contact
- Type your message and send
- Messages are delivered in real-time

## 🧪 Testing

### Manual Testing

1. **Open in two different browsers**
2. **Login with different accounts**
3. **Add each other as contacts**
4. **Test sending and receiving messages**

### Automated Testing

```bash
# Client tests
cd client
npm test

# Server tests
cd server
npm test
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Socket connection failed

```bash
# Check if socket server is running
cd socket
npm start
```

#### 2. Database connection failed

```bash
# Check if MongoDB is running
mongod
```

#### 3. Messages not sending

- Check if socket server is running
- Check console for errors
- Verify network connection

## 📊 Performance

### Optimization

- **Lazy loading** - Components load when needed
- **Image optimization** - Next.js Image component
- **Code splitting** - Split bundles into smaller chunks
- **Caching** - Cache API responses

### Monitoring

- **Socket.IO metrics** - Real-time connection monitoring
- **API response times** - Performance tracking
- **Error logging** - Error monitoring

## 🔒 Security

### Authentication

- **JWT tokens** - Secure authentication
- **Password hashing** - bcrypt encryption
- **Session management** - NextAuth.js

### Data Protection

- **Input validation** - Zod schema validation
- **SQL injection protection** - Mongoose ODM
- **XSS protection** - React built-in protection

## 🚀 Deployment

### Production Build

```bash
# Client build
cd client
npm run build
npm start

# Server build
cd server
npm start
```

### Environment Variables

```bash
# Production environment
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Submit a pull request

### Code Style

- **ESLint** - Code quality
- **Prettier** - Code formatting
- **TypeScript** - Type safety
- **Conventional commits** - Commit message format

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Oscar** - [GitHub](https://github.com/oscar-bek)

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Socket.IO** - Real-time communication
- **WebRTC** - Peer-to-peer communication
- **Tailwind CSS** - Utility-first CSS
- **MongoDB** - Database
