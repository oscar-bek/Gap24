"use client";

import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneIncoming,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";

interface IncomingCallData {
  callId: string;
  caller: {
    _id: string;
    email: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
  };
  callType: "audio" | "video";
}

interface CallManagerProps {
  socketRef?: React.MutableRefObject<Socket | null>;
}

const CallManager = ({ socketRef }: CallManagerProps) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null
  );
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.currentUser?._id || !socketRef?.current) return;

    const socket = socketRef.current;

    console.log("📌 CallManager: Setting up incoming call listener");

    socket.on("incomingCall", (data: IncomingCallData) => {
      console.log("📞 CallManager: Incoming call received:", data);
      setIncomingCall(data);

      const callerName =
        data.caller.firstName && data.caller.lastName
          ? `${data.caller.firstName} ${data.caller.lastName}`
          : data.caller.email;

      toast({
        title: "Incoming Call",
        description: `${callerName} is calling you...`,
        duration: 5000,
      });
    });

    socket.on("callRejected", ({ reason }) => {
      console.log("❌ Call was rejected:", reason);
      setIncomingCall(null);
      toast({
        title: "Call Rejected",
        description: reason || "The call was rejected",
        variant: "destructive",
      });
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callRejected");
    };
  }, [session?.currentUser?._id, socketRef]);

  if (!incomingCall) return null;

  return (
    <IncomingCallModal
      incomingCall={incomingCall}
      onClose={() => setIncomingCall(null)}
      currentUserId={session?.currentUser?._id || ""}
      socketRef={socketRef}
    />
  );
};

const IncomingCallModal = ({
  incomingCall,
  onClose,
  currentUserId,
  socketRef,
}: {
  incomingCall: IncomingCallData;
  onClose: () => void;
  currentUserId: string;
  socketRef?: React.MutableRefObject<Socket | null>;
}) => {
  const [showCallScreen, setShowCallScreen] = useState(false);

  const getDisplayName = () => {
    const caller = incomingCall.caller;
    if (!caller) return "Unknown";
    if (caller.firstName && caller.lastName) {
      return `${caller.firstName} ${caller.lastName}`;
    } else if (caller.firstName) {
      return caller.firstName;
    } else if (caller.lastName) {
      return caller.lastName;
    } else if (caller.email) {
      return caller.email;
    }
    return "Unknown User";
  };

  const handleAccept = () => {
    console.log("✅ Accepting call:", incomingCall.callId);

    if (!socketRef?.current) {
      console.error("❌ No socket connection!");
      return;
    }

    socketRef.current.emit("callAccepted", {
      callId: incomingCall.callId,
      receiver: { _id: currentUserId },
    });

    setShowCallScreen(true);
  };

  const handleReject = () => {
    console.log("❌ Rejecting call:", incomingCall.callId);

    if (socketRef?.current) {
      socketRef.current.emit("callRejected", {
        callId: incomingCall.callId,
        receiver: { _id: currentUserId },
        reason: "User declined the call",
      });
    }

    onClose();
  };

  if (showCallScreen) {
    return (
      <ActiveCallScreen
        contact={incomingCall.caller}
        callType={incomingCall.callType}
        currentUserId={currentUserId}
        callId={incomingCall.callId}
        onClose={onClose}
        isReceiver={true}
        externalSocketRef={socketRef}
      />
    );
  }

  return (
    <Dialog open onOpenChange={handleReject}>
      <DialogContent className="max-w-md p-0 bg-gradient-to-br from-green-500 to-blue-600">
        <div className="relative w-full h-[400px] flex flex-col items-center justify-center text-white">
          <PhoneIncoming className="w-16 h-16 mb-4 animate-bounce" />

          <Avatar className="w-32 h-32 mb-6 border-4 border-white">
            <AvatarImage src={incomingCall.caller.avatar} />
            <AvatarFallback className="text-4xl">
              {incomingCall.caller?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-2xl font-semibold mb-2">{getDisplayName()}</h2>
          <p className="text-lg mb-8">
            Incoming {incomingCall.callType} call...
          </p>

          <div className="flex gap-8">
            <Button
              size="icon"
              variant="destructive"
              onClick={handleReject}
              className="w-16 h-16 rounded-full"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={handleAccept}
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ActiveCallScreenProps {
  contact: {
    _id: string;
    email: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  callType: "audio" | "video";
  currentUserId: string;
  currentUserInfo?: {
    email: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
  };
  callId?: string;
  onClose: () => void;
  isReceiver?: boolean;
  externalSocketRef?: React.MutableRefObject<Socket | null> | Socket | null;
}

const ActiveCallScreen = ({
  contact,
  callType,
  currentUserId,
  currentUserInfo,
  callId: initialCallId,
  onClose,
  isReceiver = false,
  externalSocketRef,
}: ActiveCallScreenProps) => {
  const [callStatus, setCallStatus] = useState<
    "pending" | "connected" | "ended"
  >("pending");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const callIdRef = useRef<string>(initialCallId || "");
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);
  
  // ✅ FIXED: Separate flags for local and remote descriptions
  const hasLocalDescriptionRef = useRef(false);
  const hasRemoteDescriptionRef = useRef(false);
  const isNegotiatingRef = useRef(false);

  const getDisplayName = () => {
    if (!contact) return "Unknown";
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    } else if (contact.firstName) {
      return contact.firstName;
    } else if (contact.lastName) {
      return contact.lastName;
    } else {
      return contact.email;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Timer effect
  useEffect(() => {
    if (callStatus === "connected") {
      if (!timerIntervalRef.current) {
        console.log("✅ Starting timer...");
        timerIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [callStatus]);

  // Update local video when stream is available
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, []);

  // Update remote video when stream is available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Initialize socket and call
  useEffect(() => {
    if (externalSocketRef) {
      if ("current" in externalSocketRef) {
        socketRef.current = externalSocketRef.current;
      } else {
        socketRef.current = externalSocketRef as Socket;
      }
      console.log("📌 Using EXTERNAL socket connection");
    } else {
      console.error("❌ No socket reference provided!");
      toast({
        title: "Connection Error",
        description: "No socket connection available",
        variant: "destructive",
      });
      onClose();
      return;
    }

    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      console.log("🎬 Initializing call...", { isReceiver, callType });
      if (initialCallId) {
        callIdRef.current = initialCallId;
        console.log("✅ Call ID set:", initialCallId);
      }

      const constraints =
        callType === "video"
          ? {
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          : {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      console.log("✅ Local media stream obtained");

      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream;
      }

      setupSocketListeners();
      createPeerConnection();

      // ✅ FIXED: Caller waits for callAccepted before creating offer
      if (!isReceiver) {
        console.log("📞 Caller: Sending call request...");
        startCall();
      } else {
        console.log("📞 Receiver: Ready, waiting for offer");
      }
    } catch (error: any) {
      console.error("❌ Error accessing media devices:", error);
      let errorMessage = "Could not access camera/microphone.";

      if (error.name === "NotAllowedError") {
        errorMessage = "Permission denied for camera/microphone.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Camera or microphone not found.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera or microphone in use by another app.";
      }

      toast({
        title: "Media Error",
        description: errorMessage,
        variant: "destructive",
      });
      onClose();
    }
  };

  const createPeerConnection = () => {
    console.log("🌐 Creating peer connection...");

    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // ✅ FIXED: Better negotiation handling
    peerConnection.onnegotiationneeded = async () => {
      console.log("📋 Negotiation needed");

      // Only caller initiates offers
      if (isReceiver) {
        console.log("⏭️ Receiver: Skipping negotiation");
        return;
      }

      // Prevent concurrent negotiations
      if (isNegotiatingRef.current) {
        console.log("⏳ Already negotiating, skipping");
        return;
      }

      // Only create offer after call is accepted
      if (!hasLocalDescriptionRef.current && callStatus === "pending") {
        console.log("⏳ Waiting for call acceptance");
        return;
      }

      try {
        isNegotiatingRef.current = true;
        
        console.log("📤 Creating offer...");
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === "video",
        });

        await peerConnection.setLocalDescription(offer);
        hasLocalDescriptionRef.current = true;
        console.log("✅ Local description set (offer)");

        socketRef.current?.emit("offer", {
          callId: callIdRef.current,
          offer: offer,
          targetUserId: contact?._id,
        });
      } catch (error) {
        console.error("❌ Error during negotiation:", error);
      } finally {
        isNegotiatingRef.current = false;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate to:", contact?._id);
        socketRef.current?.emit("iceCandidate", {
          callId: callIdRef.current,
          candidate: event.candidate.toJSON(),
          targetUserId: contact?._id,
        });
      } else {
        console.log("✅ ICE gathering complete");
      }
    };

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      console.log("🎹 Received remote track:", event.track.kind);
      if (event.streams && event.streams.length > 0) {
        console.log("✅ Remote stream set");
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log("📌 ICE state:", state);
      console.log("📊 ICE gathering state:", peerConnection.iceGatheringState);
      console.log("📊 Signaling state:", peerConnection.signalingState);
      setConnectionState(state);

      if (state === "connected" || state === "completed") {
        console.log("✅ ICE Connected!");
        setCallStatus("connected");
        toast({
          title: "Call Connected",
          description: "You are now connected",
          duration: 2000,
        });
      }

      if (state === "failed") {
        console.log("❌ ICE failed - attempting restart");
        peerConnection.restartIce();
      }

      if (state === "disconnected") {
        console.log("⚠️ ICE disconnected - waiting 5s");
        setTimeout(() => {
          if (peerConnection.iceConnectionState === "disconnected") {
            console.log("❌ Still disconnected, ending call");
            endCall();
          }
        }, 5000);
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("➕ Adding track:", track.kind);
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionRef.current = peerConnection;
    console.log("✅ Peer connection created");
  };

  const setupSocketListeners = () => {
    if (!socketRef.current) return;

    console.log("👂 Setting up socket listeners...");

    // Remove old listeners
    socketRef.current.off("offer");
    socketRef.current.off("answer");
    socketRef.current.off("iceCandidate");
    socketRef.current.off("callAccepted");
    socketRef.current.off("callEnded");
    socketRef.current.off("callRejected");

    // ✅ FIXED: Call accepted handler
    socketRef.current.on("callAccepted", async ({ callId }) => {
      console.log("✅ Call accepted, callId:", callId);

      // Only caller creates offer after acceptance
      if (!isReceiver && peerConnectionRef.current && !hasLocalDescriptionRef.current) {
        try {
          console.log("📤 Caller: Creating initial offer...");
          const offer = await peerConnectionRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === "video",
          });

          await peerConnectionRef.current.setLocalDescription(offer);
          hasLocalDescriptionRef.current = true;
          console.log("✅ Local description set (offer)");

          socketRef.current?.emit("offer", {
            callId: callIdRef.current,
            offer: offer,
            targetUserId: contact?._id,
          });
        } catch (error) {
          console.error("❌ Error creating offer:", error);
        }
      }
    });

    // ✅ FIXED: Offer handler
    socketRef.current.on("offer", async ({ callId, offer }) => {
      console.log("📥 Received offer");

      if (!peerConnectionRef.current) return;

      try {
        // Check if we already have remote description
        if (hasRemoteDescriptionRef.current) {
          console.log("⚠️ Already have remote description");
          return;
        }

        console.log("📥 Setting remote description (offer)");
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        hasRemoteDescriptionRef.current = true;
        console.log("✅ Remote description set");

        // Process pending ICE candidates
        console.log("🧊 Processing", pendingIceCandidates.current.length, "pending ICE candidates");
        for (const candidate of pendingIceCandidates.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
        pendingIceCandidates.current = [];

        // Receiver creates answer
        if (isReceiver && !hasLocalDescriptionRef.current) {
          console.log("📤 Receiver: Creating answer...");
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          hasLocalDescriptionRef.current = true;
          console.log("✅ Local description set (answer)");

          socketRef.current?.emit("answer", {
            callId: callIdRef.current,
            answer: answer,
            targetUserId: contact?._id,
          });
        }
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    });

    // ✅ FIXED: Answer handler
    socketRef.current.on("answer", async ({ callId, answer }) => {
      console.log("📥 Received answer");

      if (!peerConnectionRef.current) return;

      try {
        if (hasRemoteDescriptionRef.current) {
          console.log("⚠️ Already have remote description");
          return;
        }

        console.log("📥 Setting remote description (answer)");
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        hasRemoteDescriptionRef.current = true;
        console.log("✅ Remote description set");

        // Process pending ICE candidates
        console.log("🧊 Processing", pendingIceCandidates.current.length, "pending ICE candidates");
        for (const candidate of pendingIceCandidates.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
        pendingIceCandidates.current = [];
      } catch (error) {
        console.error("❌ Error handling answer:", error);
      }
    });

    // ✅ FIXED: ICE candidate handler
    socketRef.current.on("iceCandidate", async ({ callId, candidate }) => {
      console.log("🧊 Received ICE candidate");

      if (!peerConnectionRef.current) return;

      try {
        const iceCandidate = new RTCIceCandidate(candidate);

        if (hasRemoteDescriptionRef.current) {
          await peerConnectionRef.current.addIceCandidate(iceCandidate);
          console.log("✅ ICE candidate added");
        } else {
          console.log("⏳ Queueing ICE candidate");
          pendingIceCandidates.current.push(iceCandidate);
        }
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    });

    socketRef.current.on("callEnded", ({ reason }) => {
      console.log("📞 Call ended:", reason);
      toast({
        title: "Call Ended",
        description: reason || "The call has ended",
      });
      setCallStatus("ended");
      endCall();
    });

    socketRef.current.on("callRejected", ({ reason }) => {
      console.log("❌ Call rejected:", reason);
      toast({
        title: "Call Rejected",
        description: reason || "The call was rejected",
        variant: "destructive",
      });
      setCallStatus("ended");
      endCall();
    });
  };

  const startCall = async () => {
    console.log("📞 Starting call request...");

    if (!socketRef.current) return;

    socketRef.current.emit("callRequest", {
      caller: currentUserInfo
        ? {
            _id: currentUserId,
            email: currentUserInfo.email,
            avatar: currentUserInfo.avatar,
            firstName: currentUserInfo.firstName,
            lastName: currentUserInfo.lastName,
          }
        : { _id: currentUserId },
      receiver: contact,
      callType,
    });

    socketRef.current.once("callRequestSent", ({ callId }) => {
      console.log("✅ Call ID received:", callId);
      callIdRef.current = callId;
    });
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log("🎤 Audio:", audioTrack.enabled ? "ON" : "OFF");
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && callType === "video") {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log("🎹 Video:", videoTrack.enabled ? "ON" : "OFF");
      }
    }
  };

  const endCall = () => {
    console.log("📞 Ending call...");

    if (socketRef.current && contact?._id) {
      socketRef.current.emit("callEnded", {
        callId: callIdRef.current,
        targetUserId: contact._id,
        reason: "User ended the call",
      });
    }

    cleanup();
    onClose();
  };

  const cleanup = () => {
    console.log("🧹 Cleaning up...");

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    setRemoteStream(null);

    if (socketRef.current) {
      socketRef.current.off("callAccepted");
      socketRef.current.off("offer");
      socketRef.current.off("answer");
      socketRef.current.off("iceCandidate");
      socketRef.current.off("callEnded");
      socketRef.current.off("callRejected");
      socketRef.current.off("callRequestSent");
    }

    console.log("✅ Cleanup complete");
  };

  return (
    <Dialog open={callStatus !== "ended"} onOpenChange={endCall}>
      <DialogContent className="max-w-2xl p-0 bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="relative w-full h-[600px] flex flex-col">
          {/* Pending State */}
          {callStatus === "pending" && (
            <div className="flex-1 flex flex-col items-center justify-center text-white">
              <Avatar className="w-32 h-32 mb-6">
                <AvatarImage src={contact?.avatar} />
                <AvatarFallback className="text-4xl">
                  {contact?.email[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <h2 className="text-2xl font-semibold mb-2">
                {getDisplayName()}
              </h2>
              <p className="text-lg mb-2 animate-pulse">
                {isReceiver ? "Connecting..." : "Calling..."}
              </p>
              <p className="text-sm text-white/70">State: {connectionState}</p>

              {callType === "video" && localStreamRef.current && (
                <div className="absolute bottom-24 right-4 w-32 h-44 rounded-lg overflow-hidden shadow-lg border-2 border-white">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Connected State */}
          {callStatus === "connected" && (
            <div className="flex-1 relative">
              {callType === "video" ? (
                <>
                  <div className="w-full h-full bg-black">
                    {remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Avatar className="w-32 h-32">
                          <AvatarImage src={contact?.avatar} />
                          <AvatarFallback className="text-4xl">
                            {contact?.email[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-4 right-4 w-32 h-44 rounded-lg overflow-hidden shadow-lg border-2 border-white">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 p-3 rounded-lg">
                    <h3 className="text-lg font-semibold">
                      {getDisplayName()}
                    </h3>
                    <p className="text-sm">{formatDuration(callDuration)}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <Avatar className="w-32 h-32 mb-6">
                    <AvatarImage src={contact?.avatar} />
                    <AvatarFallback className="text-4xl">
                      {contact?.email[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="text-2xl font-semibold mb-2">
                    {getDisplayName()}
                  </h2>
                  <p className="text-lg mb-8 font-mono">
                    {formatDuration(callDuration)}
                  </p>

                  <div className="mt-4 flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 30 + 10}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Control Buttons */}
          <div className="p-6 flex justify-center items-center gap-4 bg-black bg-opacity-30">
            <Button
              size="icon"
              variant={isAudioEnabled ? "secondary" : "destructive"}
              onClick={toggleAudio}
              className="w-14 h-14 rounded-full"
              title={isAudioEnabled ? "Mute Audio" : "Unmute Audio"}
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>

            {callType === "video" && (
              <Button
                size="icon"
                variant={isVideoEnabled ? "secondary" : "destructive"}
                onClick={toggleVideo}
                className="w-14 h-14 rounded-full"
                title={isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
            )}

            <Button
              size="icon"
              variant="destructive"
              onClick={endCall}
              className="w-14 h-14 rounded-full"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { CallManager, ActiveCallScreen };
export default CallManager;