// ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========

import {
  MenuToggleGroup,
  MenuToggleItem,
} from '@/components/MenuButton/MenuButton';
import { Button } from '@/components/ui/button';
import { agentMap } from '@/components/WorkFlow/agents';
import useChatStoreAdapter from '@/hooks/useChatStoreAdapter';
import { useWorkerList } from '@/store/authStore';
import { useWorkflowViewportStore } from '@/store/workflowViewportStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo } from 'react';

interface WorkSpaceMenuProps {
  onToggleChatBox?: () => void;
  isChatBoxVisible?: boolean;
}

export function WorkSpaceMenu({
  onToggleChatBox,
  isChatBoxVisible = true,
}: WorkSpaceMenuProps) {
  const { chatStore } = useChatStoreAdapter();
  const workerList = useWorkerList();

  const { moveLeft, moveRight } = useWorkflowViewportStore();

  const baseWorker: Agent[] = useMemo(
    () => [
      {
        tasks: [],
        agent_id: 'developer_agent',
        name: agentMap.developer_agent.name,
        type: 'developer_agent',
        log: [],
        activeWebviewIds: [],
      },
      {
        tasks: [],
        agent_id: 'browser_agent',
        name: agentMap.browser_agent.name,
        type: 'browser_agent',
        log: [],
        activeWebviewIds: [],
      },
      {
        tasks: [],
        agent_id: 'multi_modal_agent',
        name: agentMap.multi_modal_agent.name,
        type: 'multi_modal_agent',
        log: [],
        activeWebviewIds: [],
      },
      // {
      // 	tasks: [],
      // 	agent_id: "social_media_agent",
      // 	name: "Social Media Agent",
      // 	type: "social_media_agent",
      // 	log: [],
      // 	activeWebviewIds: [],
      // },
      {
        tasks: [],
        agent_id: 'document_agent',
        name: agentMap.document_agent.name,
        type: 'document_agent',
        log: [],
        activeWebviewIds: [],
      },
    ],
    []
  );

  const activeTaskId = chatStore?.activeTaskId as string;
  const taskAssigning = chatStore?.tasks[activeTaskId]?.taskAssigning;
  const webViewUrls = chatStore?.tasks[activeTaskId]?.webViewUrls;

  // Helper to safely access task properties
  const getCurrentTask = () =>
    activeTaskId ? chatStore?.tasks?.[activeTaskId] : undefined;

  const agentList = useMemo(() => {
    if (!chatStore) return [];
    const base = [...baseWorker, ...workerList].filter(
      (worker) => !taskAssigning?.find((agent) => agent.type === worker.type)
    );
    return [...base, ...(taskAssigning || [])];
  }, [chatStore, baseWorker, workerList, taskAssigning]);

  useEffect(() => {
    if (!chatStore) return;
    const cleanup = window.electronAPI.onWebviewNavigated(
      (id: string, url: string) => {
        if (!chatStore.activeTaskId) return;
        const currentTask = getCurrentTask();
        if (!currentTask) return;

        let webViewUrls = [...(currentTask.webViewUrls || [])];
        let taskAssigning = [...(currentTask.taskAssigning || [])];
        const hasId = taskAssigning.find((item) =>
          item.activeWebviewIds?.find((webview) => webview.id === id)
        );
        if (!hasId) {
          const hasUrl = webViewUrls.find(
            (item) => new URL(item.url).hostname === new URL(url).hostname
          );

          if (hasUrl) {
            const activeAgentIndex = taskAssigning.findIndex((item) =>
              item.tasks.find((task) => task.id === hasUrl?.processTaskId)
            );

            if (activeAgentIndex === -1) {
              const browserAgentIndex = taskAssigning.findIndex(
                (item) => item.type === 'browser_agent'
              );
              if (browserAgentIndex !== -1) {
                taskAssigning[browserAgentIndex].activeWebviewIds?.push({
                  id,
                  url,
                  img: '',
                  processTaskId: hasUrl?.processTaskId || '',
                });
                chatStore.setTaskAssigning(
                  chatStore.activeTaskId as string,
                  taskAssigning
                );
              }
            } else {
              taskAssigning[activeAgentIndex].activeWebviewIds?.push({
                id,
                url,
                img: '',
                processTaskId: hasUrl?.processTaskId || '',
              });
              chatStore.setTaskAssigning(
                chatStore.activeTaskId as string,
                taskAssigning
              );
            }
            const urlIndex = webViewUrls.findIndex((item) => item.url === url);
            if (urlIndex !== -1) {
              webViewUrls.splice(urlIndex, 1);
            }
            chatStore.setWebViewUrls(chatStore.activeTaskId as string, [
              ...webViewUrls,
            ]);
          } else {
            // If no URL match found, also try to add to browser_agent
            const browserAgentIndex = taskAssigning.findIndex(
              (item) => item.type === 'browser_agent'
            );
            if (browserAgentIndex !== -1 && webViewUrls.length > 0) {
              taskAssigning[browserAgentIndex].activeWebviewIds?.push({
                id,
                url,
                img: '',
                processTaskId: webViewUrls[0]?.processTaskId || '',
              });
              chatStore.setTaskAssigning(
                chatStore.activeTaskId as string,
                taskAssigning
              );
            }
          }
        }

        let webviews: { id: string; agent_id: string; index: number }[] = [];
        taskAssigning.map((item) => {
          if (item.type === 'browser_agent') {
            item.activeWebviewIds?.map((webview, index) => {
              // console.log("@@@@@@", webview);
              if (webview.id === id) {
                webviews.push({ ...webview, agent_id: item.agent_id, index });
              }
            });
          }
        });

        if (taskAssigning.length === 0 || webviews.length === 0) return;

        // capture webview
        const captureWebview = () => {
          webviews.map((webview) => {
            window.ipcRenderer
              .invoke('capture-webview', webview.id)
              .then((base64: string) => {
                const currentTask = getCurrentTask();
                if (!currentTask) return;

                let taskAssigning = [...(currentTask.taskAssigning || [])];
                const browserAgentIndex = taskAssigning.findIndex(
                  (agent) => agent.agent_id === webview.agent_id
                );

                if (
                  browserAgentIndex !== -1 &&
                  base64 &&
                  base64 !== 'data:image/jpeg;base64,'
                ) {
                  taskAssigning[browserAgentIndex].activeWebviewIds![
                    webview.index
                  ].img = base64;

                  chatStore.setTaskAssigning(
                    chatStore.activeTaskId as string,
                    taskAssigning
                  );
                }
              })
              .catch((error: unknown) => {
                console.error('capture webview error:', error);
              });
          });
        };
        setTimeout(() => {
          captureWebview();
        }, 200);
      }
    );

    // Cleanup function to remove listener when component unmounts or dependencies change
    return cleanup;
  }, [chatStore, activeTaskId, webViewUrls, taskAssigning]);

  if (!chatStore) {
    return <div>Loading...</div>;
  }

  const agentIconMap = {
    developer_agent: (
      <span
        className={`h-2.5 w-2.5 rounded-full ${agentMap.developer_agent.bgColor}`}
      />
    ),
    browser_agent: (
      <span
        className={`h-2.5 w-2.5 rounded-full ${agentMap.browser_agent.bgColor}`}
      />
    ),
    document_agent: (
      <span
        className={`h-2.5 w-2.5 rounded-full ${agentMap.document_agent.bgColor}`}
      />
    ),
    multi_modal_agent: (
      <span
        className={`h-2.5 w-2.5 rounded-full ${agentMap.multi_modal_agent.bgColor}`}
      />
    ),
    social_media_agent: (
      <span
        className={`h-2.5 w-2.5 rounded-full ${agentMap.social_media_agent.bgColor}`}
      />
    ),
  };

  const onValueChange = (val: string) => {
    if (!chatStore.activeTaskId) return;
    if (val === '') {
      chatStore.setActiveWorkspace(chatStore.activeTaskId, 'workflow');
      return;
    }
    if (val === 'documentWorkSpace') {
      chatStore.setNuwFileNum(chatStore.activeTaskId, 0);
    }
    chatStore.setActiveWorkspace(chatStore.activeTaskId, val);

    window.electronAPI.hideAllWebview();
  };

  return (
    <div className="w-full">
      <div className="relative mx-auto flex w-fit max-w-full items-center justify-center rounded-[20px] border border-cyan-400/10 bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(11,20,34,0.88))] px-3 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
        <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_30%)]" />
        <div className="via-emerald-200/30 pointer-events-none absolute inset-x-6 bottom-2 h-px bg-gradient-to-r from-transparent to-transparent" />
        <div className="relative flex h-full w-full flex-row items-center justify-center">
          {/* activeAgent */}
          <AnimatePresence>
            {agentList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`flex w-fit flex-row gap-2 pl-2`}
              >
                <MenuToggleGroup
                  type="single"
                  size="md"
                  orientation="horizontal"
                  value={getCurrentTask()?.activeWorkspace as string}
                  onValueChange={onValueChange}
                  className="flex w-full items-center gap-2 pb-2"
                >
                  <AnimatePresence mode="popLayout">
                    {agentList.map((agent) => {
                      const displayInfo =
                        agentMap[agent.type as keyof typeof agentMap];

                      return (
                        <motion.div
                          key={agent.agent_id}
                          initial={{ opacity: 0, scale: 0.8, x: -20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.8, x: 20 }}
                          transition={{
                            duration: 0.3,
                            ease: 'easeInOut',
                          }}
                          layout
                        >
                          <MenuToggleItem
                            disabled={
                              ![
                                'developer_agent',
                                'browser_agent',
                                'document_agent',
                                'multi_modal_agent',
                              ].includes(agent.type as AgentNameType) ||
                              agent.tasks.length === 0
                            }
                            value={agent.agent_id}
                            icon={
                              displayInfo?.icon || (
                                <Bot className="text-slate-200" />
                              )
                            }
                            subIcon={
                              agentIconMap[
                                agent.type as keyof typeof agentIconMap
                              ]
                            }
                            showSubIcon={true}
                            className={`border-white/5 border bg-slate-950/20 backdrop-blur-sm ${
                              agent.tasks.length === 0 ? 'opacity-30' : ''
                            }`}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </MenuToggleGroup>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Viewport Navigation Buttons */}
          {(moveLeft || moveRight) && (
            <div className="absolute right-2 flex items-center pb-2">
              <Button
                variant="ghost"
                size="md"
                className="px-2"
                onClick={moveLeft || undefined}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="px-2"
                onClick={moveRight || undefined}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
