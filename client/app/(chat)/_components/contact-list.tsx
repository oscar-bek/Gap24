"use client";

import { IUser } from "@/types";
import React, { FC, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, sliceText } from "@/lib/utils";
import { useCurrentContact } from "@/hooks/use-current";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { CONST } from "@/lib/constants";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, UserPlus } from "lucide-react";
import Settings from "./settings";

interface Props {
  contacts: IUser[];
  onContactClick?: (contact: IUser) => void;
}

const ContactList: FC<Props> = ({ contacts, onContactClick }) => {
  const [query, setQuery] = useState("");

  const { onlineUsers } = useAuth();
  const { setCurrentContact, currentContact } = useCurrentContact();
  const { data: session } = useSession();

  const filteredContacts = contacts
    .filter((contact) =>
      contact.email.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = a.lastMessage?.updatedAt
        ? new Date(a.lastMessage.updatedAt).getTime()
        : 0;
      const dateB = b.lastMessage?.updatedAt
        ? new Date(b.lastMessage.updatedAt).getTime()
        : 0;
      return dateB - dateA;
    });

  const renderContact = (contact: IUser) => {
    const onChat = () => {
      setCurrentContact(contact);
      onContactClick?.(contact);
    };

    return (
      <div
        className={cn(
          "flex justify-between items-center cursor-pointer hover:bg-secondary/50 p-3 transition-colors",
          currentContact?._id === contact._id && "bg-secondary/50"
        )}
        onClick={onChat}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar className="w-12 h-12">
              <AvatarImage
                src={contact.avatar}
                alt={contact.email}
                className="object-cover"
              />
              <AvatarFallback className="uppercase">
                {contact.email[0]}
              </AvatarFallback>
            </Avatar>
            {onlineUsers.some((user) => user._id === contact._id) && (
              <div className="size-3 bg-green-500 absolute rounded-full bottom-0 right-0 border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="capitalize line-clamp-1 text-sm font-medium text-foreground">
              {contact.email.split("@")[0]}
            </h2>
            {contact.lastMessage?.image && (
              <div className="flex items-center gap-1">
                <Image
                  src={contact.lastMessage.image}
                  alt={contact.email}
                  width={20}
                  height={20}
                  className="object-cover rounded"
                />
                <p
                  className={cn(
                    "text-xs line-clamp-1",
                    contact.lastMessage
                      ? contact.lastMessage?.sender._id ===
                        session?.currentUser?._id
                        ? "text-muted-foreground"
                        : contact.lastMessage.status !== CONST.READ
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  Photo
                </p>
              </div>
            )}
            {!contact.lastMessage?.image && (
              <p
                className={cn(
                  "text-xs line-clamp-1",
                  contact.lastMessage
                    ? contact.lastMessage?.sender._id ===
                      session?.currentUser?._id
                      ? "text-muted-foreground"
                      : contact.lastMessage.status !== CONST.READ
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                    : "text-muted-foreground"
                )}
              >
                {contact.lastMessage
                  ? sliceText(contact.lastMessage.text, 30)
                  : "No messages yet"}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {contact.lastMessage && (
            <p className="text-xs text-muted-foreground">
              {format(contact.lastMessage.updatedAt, "hh:mm a")}
            </p>
          )}
          {contact.lastMessage?.status !== CONST.READ &&
            contact.lastMessage?.sender._id !== session?.currentUser?._id && (
              <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] text-primary-foreground font-medium">
                  1
                </span>
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-secondary sticky top-0 z-10">
        <Settings />
        <div className="flex-1">
          <Input
            className="bg-muted border-none h-9 text-foreground"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search..."
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => window.location.reload()}
          title="Add new contact"
        >
          <UserPlus className="h-5 w-5 text-foreground" />
        </Button>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/80">
        {filteredContacts.length === 0 ? (
          <div className="w-full h-full flex flex-col justify-center items-center text-center text-muted-foreground p-4">
            <p className="text-sm">Contact list is empty</p>
            <p className="text-xs mt-2">Add contacts to start chatting</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div key={contact._id}>{renderContact(contact)}</div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList;
