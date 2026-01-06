app.use(express.json())
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}))
app.use(cookieParser())
app.use('/api', require('./routes/index'))

app.use(errorMiddleware)

// ⭐ Socket events'ni setup qilish
require('./socket')(io)

const bootstrap = async () => {
  try {
    const PORT = process.env.PORT || 6000
    mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected'))
    
    // ⭐ app.listen() o'rniga server.listen() ishlatish
    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`)
      console.log(`📡 Socket.io is listening on port 5000`)
    })
  } catch (error) {
    console.error(error)
  }
}

bootstrap()

module.exports = app