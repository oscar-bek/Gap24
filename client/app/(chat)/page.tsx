"use client";

import { Loader2, ArrowLeft } from "lucide-react";
import ContactList from "./_components/contact-list";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import AddContact from "./_components/add-contact";
import { useCurrentContact } from "@/hooks/use-current";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { emailSchema, messageSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import TopChat from "./_components/top-chat";
import Chat from "./_components/chat";
import { useLoading } from "@/hooks/use-loading";
import { axiosClient } from "@/http/axios";
import { useSession } from "next-auth/react";
import { generateToken } from "@/lib/generate-token";
import { IError, IMessage, IUser } from "@/types";
import { toast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import useAudio from "@/hooks/use-audio";
import { CONST } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Settings from "./_components/settings";
import CallManager from "@/components/AudioVideoCall";

const HomePage = () => {
  const [contacts, setContacts] = useState<IUser[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Helper function to get display name
  const getDisplayName = (user: IUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    } else {
      return user.email;
    }
  };

  const { setCreating, setLoading, isLoading, setLoadMessages, setTyping } =
    useLoading();
  const { currentContact, editedMessage, setEditedMessage, setCurrentContact } =
    useCurrentContact();
  const { data: session } = useSession();
  const { setOnlineUsers } = useAuth();
  const { playSound } = useAudio();

  const socket = useRef<ReturnType<typeof io> | null>(null);

  const contactForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { text: "", image: "" },
  });

  const getContacts = async () => {
    setLoading(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.get<{ contacts: IUser[] }>(
        "/api/user/contacts",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setContacts(data.contacts);
    } catch {
      toast({ description: "Cannot fetch contacts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getMessages = async () => {
    setLoadMessages(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.get<{ messages: IMessage[] }>(
        `/api/user/messages/${currentContact?._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(data.messages);
      setContacts((prev) =>
        prev.map((item) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage: item.lastMessage
                  ? { ...item.lastMessage, status: CONST.READ }
                  : null,
              }
            : item
        )
      );
    } catch {
      toast({ description: "Cannot fetch messages", variant: "destructive" });
    } finally {
      setLoadMessages(false);
    }
  };

  useEffect(() => {
    console.log("🔌 Initializing socket connection...");

    socket.current = io("http://localhost:5000", {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.current.on("connect", () => {
      console.log("✅ Socket connected:", socket.current?.id);
    });

    socket.current.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.current.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    return () => {
      console.log("🔌 Disconnecting socket...");
      socket.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (session?.currentUser?._id && socket.current) {
      console.log("👤 Adding user as online:", session.currentUser._id);

      socket.current.emit("addOnlineUser", session.currentUser);

      socket.current.on(
        "getOnlineUsers",
        (data: { socketId: string; user: IUser }[]) => {
          console.log("👥 Online users updated:", data.length);
          setOnlineUsers(data.map((item) => item.user));
        }
      );

      getContacts();
    }
  }, [session?.currentUser, socket.current]);

  useEffect(() => {
    if (session?.currentUser && socket.current) {
      socket.current.on("getCreatedUser", (user) => {
        setContacts((prev) => {
          const isExist = prev.some((item) => item._id === user._id);
          return isExist ? prev : [...prev, user];
        });

        const userName = getDisplayName(user);
        toast({
          title: "New Contact",
          description: `${userName} added you as a contact`,
          duration: 4000,
        });
      });

      socket.current.on(
        "getNewMessage",
        ({ newMessage, sender, receiver }: GetSocketType) => {
          setTyping({ message: "", sender: null });
          if (currentContact?._id === newMessage.sender._id) {
            setMessages((prev) => [...prev, newMessage]);
          }
          setContacts((prev) => {
            return prev.map((contact) => {
              if (contact._id === sender._id) {
                return {
                  ...contact,
                  lastMessage: {
                    ...newMessage,
                    status:
                      currentContact?._id === sender._id
                        ? CONST.READ
                        : newMessage.status,
                  },
                };
              }
              return contact;
            });
          });
          if (!receiver.muted) {
            playSound(receiver.notificationSound);
          }

          if (!currentContact?._id) {
            const senderName = getDisplayName(sender);
            toast({
              title: "New Message",
              description: `${senderName} sent you a message`,
              duration: 5000,
            });
          } else if (currentContact?._id !== newMessage.sender._id) {
            const senderName = getDisplayName(sender);
            toast({
              title: "New Message",
              description: `${senderName} sent you a message`,
              duration: 5000,
            });
          } else if (currentContact?._id === newMessage.sender._id) {
            const senderName = getDisplayName(sender);
            toast({
              title: "Message Received",
              description: `Message from ${senderName}`,
              duration: 3000,
            });
          }
        }
      );

      socket.current.on("getReadMessages", (messages: IMessage[]) => {
        setMessages((prev) => {
          return prev.map((item) => {
            const message = messages.find((msg) => msg._id === item._id);
            return message ? { ...item, status: CONST.READ } : item;
          });
        });

        if (
          messages.length > 0 &&
          currentContact?._id === messages[0]?.sender._id
        ) {
          const contactName = getDisplayName(currentContact);
          toast({
            title: "Message Read",
            description: `${contactName} read your message`,
            duration: 2000,
          });
        }
      });

      socket.current.on(
        "getUpdatedMessage",
        ({ updatedMessage, sender }: GetSocketType) => {
          setTyping({ message: "", sender: null });
          setMessages((prev) =>
            prev.map((item) =>
              item._id === updatedMessage._id
                ? {
                    ...item,
                    reaction: updatedMessage.reaction,
                    text: updatedMessage.text,
                  }
                : item
            )
          );
          setContacts((prev) =>
            prev.map((item) =>
              item._id === sender._id
                ? {
                    ...item,
                    lastMessage:
                      item.lastMessage?._id === updatedMessage._id
                        ? updatedMessage
                        : item.lastMessage,
                  }
                : item
            )
          );
        }
      );

      socket.current.on(
        "getDeletedMessage",
        ({ deletedMessage, sender, filteredMessages }: GetSocketType) => {
          setMessages((prev) =>
            prev.filter((item) => item._id !== deletedMessage._id)
          );
          const lastMessage = filteredMessages.length
            ? filteredMessages[filteredMessages.length - 1]
            : null;
          setContacts((prev) =>
            prev.map((item) =>
              item._id === sender._id
                ? {
                    ...item,
                    lastMessage:
                      item.lastMessage?._id === deletedMessage._id
                        ? lastMessage
                        : item.lastMessage,
                  }
                : item
            )
          );

          if (currentContact?._id !== sender._id) {
            const senderName = getDisplayName(sender);
            toast({
              title: "Message Deleted",
              description: `${senderName} deleted a message`,
              duration: 3000,
            });
          }
        }
      );

      socket.current.on("getTyping", ({ message, sender }: GetSocketType) => {
        if (currentContact?._id === sender._id) {
          setTyping({ message, sender });
        }
      });
    }
  }, [session?.currentUser, currentContact?._id, socket.current]);

  useEffect(() => {
    if (currentContact?._id) {
      getMessages();
      setIsChatOpen(true);
    }
  }, [currentContact]);

  const onCreateContact = async (values: z.infer<typeof emailSchema>) => {
    setCreating(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<{ contact: IUser }>(
        "/api/user/contact",
        values,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setContacts((prev) => [...prev, data.contact]);
      socket.current?.emit("createContact", {
        currentUser: session?.currentUser,
        receiver: data.contact,
      });
      toast({ description: "Contact added successfully" });
      contactForm.reset();
    } catch (error: unknown) {
      if ((error as IError).response?.data?.message) {
        return toast({
          description: (error as IError).response.data.message,
          variant: "destructive",
        });
      }
      return toast({
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const onSubmitMessage = async (values: z.infer<typeof messageSchema>) => {
    setCreating(true);
    if (editedMessage?._id) {
      onEditMessage(editedMessage._id, values.text);
    } else {
      onSendMessage(values);
    }
  };

  const onSendMessage = async (values: z.infer<typeof messageSchema>) => {
    setCreating(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<GetSocketType>(
        "/api/user/message",
        { ...values, receiver: currentContact?._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) => [...prev, data.newMessage]);
      setContacts((prev) =>
        prev.map((item) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage: { ...data.newMessage, status: CONST.READ },
              }
            : item
        )
      );
      messageForm.reset();
      socket.current?.emit("sendMessage", {
        newMessage: data.newMessage,
        receiver: data.receiver,
        sender: data.sender,
      });
      if (!data.sender.muted) {
        playSound(data.sender.sendingSound);
      }
    } catch {
      toast({ description: "Cannot send message", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const onEditMessage = async (messageId: string, text: string) => {
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.put<{ updatedMessage: IMessage }>(
        `/api/user/message/${messageId}`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) =>
        prev.map((item) =>
          item._id === data.updatedMessage._id
            ? { ...item, text: data.updatedMessage.text }
            : item
        )
      );
      socket.current?.emit("updateMessage", {
        updatedMessage: data.updatedMessage,
        receiver: currentContact,
        sender: session?.currentUser,
      });
      messageForm.reset();
      setContacts((prev) =>
        prev.map((item) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage:
                  item.lastMessage?._id === messageId
                    ? data.updatedMessage
                    : item.lastMessage,
              }
            : item
        )
      );
      setEditedMessage(null);
    } catch {
      toast({ description: "Cannot edit message", variant: "destructive" });
    }
  };

  const onReadMessages = async () => {
    const receivedMessages = messages
      .filter((message) => message.receiver._id === session?.currentUser?._id)
      .filter((message) => message.status !== CONST.READ);

    if (receivedMessages.length === 0) return;
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<{ messages: IMessage[] }>(
        "/api/user/message-read",
        { messages: receivedMessages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socket.current?.emit("readMessages", {
        messages: data.messages,
        receiver: currentContact,
      });
      setMessages((prev) => {
        return prev.map((item) => {
          const message = data.messages.find((msg) => msg._id === item._id);
          return message ? { ...item, status: CONST.READ } : item;
        });
      });
    } catch {
      toast({ description: "Cannot read messages", variant: "destructive" });
    }
  };

  const onReaction = async (reaction: string, messageId: string) => {
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<{ updatedMessage: IMessage }>(
        "/api/user/reaction",
        { reaction, messageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) =>
        prev.map((item) =>
          item._id === data.updatedMessage._id
            ? { ...item, reaction: data.updatedMessage.reaction }
            : item
        )
      );
      socket.current?.emit("updateMessage", {
        updatedMessage: data.updatedMessage,
        receiver: currentContact,
        sender: session?.currentUser,
      });
    } catch {
      toast({ description: "Cannot react to message", variant: "destructive" });
    }
  };

  const onDeleteMessage = async (messageId: string) => {
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.delete<{ deletedMessage: IMessage }>(
        `/api/user/message/${messageId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const filteredMessages = messages.filter(
        (item) => item._id !== data.deletedMessage._id
      );
      const lastMessage = filteredMessages.length
        ? filteredMessages[filteredMessages.length - 1]
        : null;
      setMessages(filteredMessages);
      socket.current?.emit("deleteMessage", {
        deletedMessage: data.deletedMessage,
        sender: session?.currentUser,
        receiver: currentContact,
        filteredMessages,
      });
      setContacts((prev) =>
        prev.map((item) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage:
                  item.lastMessage?._id === messageId
                    ? lastMessage
                    : item.lastMessage,
              }
            : item
        )
      );
    } catch {
      toast({ description: "Cannot delete message", variant: "destructive" });
    }
  };

  const onTyping = (e: ChangeEvent<HTMLInputElement>) => {
    socket.current?.emit("typing", {
      receiver: currentContact,
      sender: session?.currentUser,
      message: e.target.value,
    });
  };

  const handleContactClick = (contact: IUser) => {
    setCurrentContact(contact);
  };

  const handleBackToContacts = () => {
    setIsChatOpen(false);
    setCurrentContact(null);
  };

  return (
    <>
      {/* Call Manager with socket reference */}
      <CallManager socketRef={socket} />

      <div className="flex h-screen overflow-hidden">
        {/* Contact List Sidebar */}
        <div
          className={`w-full md:w-80 h-screen border-r bg-background transition-transform duration-300 ${
            isChatOpen ? "hidden md:block" : "block"
          }`}
        >
          {isLoading && (
            <div className="w-full h-[95vh] flex justify-center items-center">
              <Loader2 size={50} className="animate-spin" />
            </div>
          )}

          {!isLoading && (
            <ContactList
              contacts={contacts}
              onContactClick={handleContactClick}
            />
          )}
        </div>

        {/* Chat Area */}
        <div className={`flex-1 ${isChatOpen ? "block" : "hidden md:block"}`}>
          {!currentContact?._id && (
            <div className="absolute top-4 right-4 z-50">
              <Settings />
            </div>
          )}

          {!currentContact?._id && (
            <AddContact
              contactForm={contactForm}
              onCreateContact={onCreateContact}
            />
          )}

          {currentContact?._id && (
            <div className="w-full h-screen flex flex-col relative">
              <div className="md:hidden absolute top-2 left-2 z-50">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleBackToContacts}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>

              <div className="absolute top-2 right-2 z-50">
                <Settings />
              </div>

              <TopChat
                messages={messages}
                onBack={handleBackToContacts}
                socketRef={socket.current}
              />

              <Chat
                messageForm={messageForm}
                onSubmitMessage={onSubmitMessage}
                messages={messages}
                onReadMessages={onReadMessages}
                onReaction={onReaction}
                onDeleteMessage={onDeleteMessage}
                onTyping={onTyping}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HomePage;

interface GetSocketType {
  receiver: IUser;
  sender: IUser;
  newMessage: IMessage;
  updatedMessage: IMessage;
  deletedMessage: IMessage;
  filteredMessages: IMessage[];
  message: string;
}
