"use client";
import { Thread } from "@/components/assistant-ui/thread";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export default function Home() {
  const runtime = useChatRuntime({ api: "/api/chat" });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="h-dvh grid grid-cols-1 md:grid-cols-[250px_1fr] gap-x-2 px-2 md:px-4 py-2 md:py-4">
        <div className="hidden md:block">
          <ThreadList />
        </div>
        <div className="col-span-1">
          <Thread />
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}
