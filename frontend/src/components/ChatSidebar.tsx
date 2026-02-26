"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Home, Menu, MessageSquare, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { GoSidebarCollapse } from "react-icons/go";
import ConnectWalletButton from "./ConnectWalletButton";

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

interface ChatListProps {
  isCollapsed: boolean;
  chatHistory: ChatSession[];
  currentChatId: string | null;
  onSwitchChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
}

function ChatList({
  isCollapsed,
  chatHistory,
  currentChatId,
  onSwitchChat,
  onDeleteChat,
  onNewChat,
}: ChatListProps) {
  const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteChat(chatId);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* New Chat Button */}
      <Button
        onClick={onNewChat}
        className="flex items-center gap-2 px-3 py-2 mb-2 bg-gradient-to-r from-[#1E3DFF] via-[#7A1EFF] to-[#FF1E99] hover:from-[#7A1EFF] hover:to-[#1E3DFF] text-white rounded-md transition-all duration-300"
      >
        <MessageSquare className="h-4 w-4" />
        {!isCollapsed && <span className="text-sm">New Chat</span>}
      </Button>

      {/* Chat List */}
      {chatHistory.map((chat) => {
        const isActive = chat.id === currentChatId;
        return (
          <div
            key={chat.id}
            onClick={() => onSwitchChat(chat.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors group cursor-pointer ${
              isActive
                ? "bg-gradient-to-r from-[#1E3DFF] via-[#7A1EFF] to-[#FF1E99] text-white"
                : "hover:bg-gray-800 text-gray-300 hover:text-white"
            }`}
          >
            <MessageSquare
              className={`h-4 w-4 flex-shrink-0 ${
                isActive ? "text-white" : "text-muted-foreground"
              }`}
            />
            {!isCollapsed && (
              <>
                <span
                  className={`truncate text-sm flex-1 ${
                    isActive ? "text-white font-semibold" : ""
                  }`}
                  title={chat.title}
                >
                  {chat.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  onClick={(e) => handleDeleteClick(e, chat.id)}
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ChatSidebarProps {
  chatHistory: ChatSession[];
  currentChatId: string | null;
  onSwitchChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({
  chatHistory,
  currentChatId,
  onSwitchChat,
  onDeleteChat,
  onNewChat,
}: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex fixed top-4 left-4 z-40 "
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
        >
          <GoSidebarCollapse className="w-6 h-6" />
        </Button>
      )}
      {/* Mobile Sheet Sidebar */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Link href="/" className="font-bold text-lg text-white">
                    ChainPilot AI
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-100"
                    aria-label="Collapse sidebar"
                    onClick={() => setCollapsed(true)}
                  >
                    <GoSidebarCollapse className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <nav className="flex-1 flex flex-col gap-2 px-4 py-6">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </Link>
                <div className="mt-4">
                  <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                    Chats
                  </div>
                  <ChatList
                    isCollapsed={false}
                    chatHistory={chatHistory}
                    currentChatId={currentChatId}
                    onSwitchChat={onSwitchChat}
                    onDeleteChat={onDeleteChat}
                    onNewChat={onNewChat}
                  />
                </div>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors mt-auto"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
              </nav>
              <Separator />
              <div className="px-6 py-4 border-t border-border/40 flex items-center gap-3">
                <ConnectWalletButton />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-black text-white border-r border-border/40 shadow-lg transition-all duration-300 ${
          collapsed ? "w-0 min-w-0 overflow-hidden" : "w-64"
        }`}
      >
        {!collapsed && (
          <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Link href="/" className="font-bold text-lg">
                ChainPilot AI
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="opacity-100"
                aria-label="Collapse sidebar"
                onClick={() => setCollapsed(true)}
              >
                <GoSidebarCollapse className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
        {/* Chat Section */}
        {!collapsed && (
          <>
            <div className="flex-1 flex flex-col bg-[#1e2019] overflow-y-auto">
              <div
                className={`px-4 pt-4 pb-2 text-xs font-medium  uppercase tracking-wider`}
              >
                Chats
              </div>
              <div className="px-2 flex-1 overflow-y-auto">
                <ChatList
                  isCollapsed={collapsed}
                  chatHistory={chatHistory}
                  currentChatId={currentChatId}
                  onSwitchChat={onSwitchChat}
                  onDeleteChat={onDeleteChat}
                  onNewChat={onNewChat}
                />
              </div>
            </div>
            <Separator />
            <div className="px-4 py-4 border-t border-border/40 flex items-center gap-3">
              <ConnectWalletButton />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
