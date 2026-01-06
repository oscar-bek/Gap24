# Agora Video & Audio Call Setup Guide

Bu guide sizning Gap loyihangizda Agora.io real-time communication ni qanday o'rnatish va sozlash kerakligini tushuntiradi.

## 🚀 Boshlash

### 1. Agora.io da ro'yxatdan o'ting

- [Agora.io](https://www.agora.io/en/) ga boring
- "Get Started" tugmasini bosing
- Free account yarating

### 2. App ID oling

- Dashboard ga kiring
- "Create Project" tugmasini bosing
- Project nomini kiriting (masalan: "Gap ")
- "Create" tugmasini bosing
- App ID ni nusxalang

### 3. Environment Variable ni sozlang

`.env.local` faylida:

```bash
NEXT_PUBLIC_AGORA_APP_ID=your_actual_app_id_here
```

## 📱 Call Funksionalligi

### Audio Call

- Microphone on/off
- Mute/unmute
- Speaker mode
- Call controls

### Video Call

- Camera on/off
- Screen sharing
- Picture-in-picture
- HD video quality

### Call Controls

- Audio toggle
- Video toggle
- Screen share toggle
- End call
- Call status display

## 🔧 Integratsiya

### CallButtons Component

```tsx
// Audio call boshlash
<Button onClick={handleAudioCall}>
  <Phone className="w-4 h-4" />
</Button>

// Video call boshlash
<Button onClick={handleVideoCall}>
  <Video className="w-4 h-4" />
</Button>
```

### Agora Call Service

```tsx
import { agoraCallService } from "@/lib/agora-call.service";

// Call boshlash
await agoraCallService.initializeCall({
  appId: "your_app_id",
  channelName: "unique_channel_name",
  token: "optional_token",
  uid: 12345,
});
```

## 🌐 Production Setup

### 1. Agora App Certificate

- Dashboard da App Certificate ni oling
- Server-side token generation uchun kerak

### 2. Token Server

```typescript
// Server-side token generation
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

const appID = "your_app_id";
const appCertificate = "your_app_certificate";
const channelName = "channel_name";
const uid = 0;
const role = RtcRole.PUBLISHER;
const expirationTimeInSeconds = 3600;
const currentTimestamp = Math.floor(Date.now() / 1000);
const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

const token = RtcTokenBuilder.buildTokenWithUid(
  appID,
  appCertificate,
  channelName,
  uid,
  role,
  privilegeExpiredTs
);
```

### 3. Environment Variables

```bash
# Production
NEXT_PUBLIC_AGORA_APP_ID=your_production_app_id
AGORA_APP_CERTIFICATE=your_production_certificate
AGORA_TOKEN_SERVER_URL=https://your-server.com/agora/token
```

## 🎯 Features

✅ **Real-time Communication** - Ultra-low latency  
✅ **Cross-platform** - Web, iOS, Android  
✅ **Scalable** - 1 dan millionlab user gacha  
✅ **HD Quality** - Professional video/audio  
✅ **Screen Sharing** - Desktop sharing  
✅ **Group Calls** - Multiple participants

## 🐛 Troubleshooting

### Common Issues

1. **"App ID not configured"**

   - `.env.local` faylida `NEXT_PUBLIC_AGORA_APP_ID` ni to'g'ri sozlang

2. **Camera/Microphone access denied**

   - Browser permissions ni tekshiring
   - HTTPS da ishlayotganingizga ishonch hosil qiling

3. **Call not connecting**

   - Network connection ni tekshiring
   - Agora App ID to'g'ri ekanligini tekshiring

4. **Poor video quality**
   - Network bandwidth ni tekshiring
   - Device performance ni tekshiring

### Debug Mode

```typescript
// Console da call state ni ko'rish
const callState = agoraCallService.getCallState();
console.log("Call State:", callState);
```

## 📚 Additional Resources

- [Agora Documentation](https://docs.agora.io/)
- [Web SDK Guide](https://docs.agora.io/en/Video/API%20Reference/web/index.html)
- [Sample Apps](https://github.com/AgoraIO)
- [Community Support](https://www.agora.io/en/community)

## 🎉 Congratulations!

Endi sizning Gap loyihangizda professional audio va video call funksionalligi bor!

Agora SDK sizga:

- High-quality real-time communication
- Professional call controls
- Screen sharing capabilities
- Cross-platform compatibility

beradi. CallButtons component ni bosib call boshlashingiz mumkin!
