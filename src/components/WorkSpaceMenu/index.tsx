// ========= Copyright 2025-2026 @ eigent.ai All Rights Reserved. =========
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
// ========= Copyright 2025-2026 @ eigent.ai All Rights Reserved. =========

import { AddWorker } from '@/components/AddWorker';
import { fetchDelete, fetchGet, fetchPost, fetchPut } from '@/api/http';
import {
  Dialog,
  DialogContent,
  DialogContentSection,
  DialogHeader,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import useChatStoreAdapter from '@/hooks/useChatStoreAdapter';
import { useWorkerList } from '@/store/authStore';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bird,
  Bot,
  CodeXml,
  FileText,
  Globe,
  Image,
  Inbox,
  LayoutGrid,
  MousePointerClick,
  Pencil,
  Play,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

type MacroRecordMode = 'time' | 'hotkey';

type MacroEvent = {
  type?: string;
  delay?: number;
  [key: string]: unknown;
};

type MacroRecordingDetail = {
  name?: string;
  created_at?: string;
  duration_seconds?: number;
  trigger_keys?: {
    start?: string | null;
    stop?: string | null;
  };
  events?: MacroEvent[];
};

const formatEventDelay = (delay: unknown) => {
  const parsed = Number(delay);
  if (!Number.isFinite(parsed) || parsed < 0) return '0.000';
  return parsed.toFixed(3);
};

const describeMacroEvent = (event: MacroEvent) => {
  const type = String(event.type || '');

  if (type === 'mouse_move') {
    const x = Number(event.x ?? 0);
    const y = Number(event.y ?? 0);
    return `Mover mouse a (${x}, ${y})`;
  }
  if (type === 'mouse_click') {
    const action = Boolean(event.pressed) ? 'presionar' : 'soltar';
    const button = String(event.button || 'left');
    const x = Number(event.x ?? 0);
    const y = Number(event.y ?? 0);
    return `${action} click ${button} en (${x}, ${y})`;
  }
  if (type === 'mouse_scroll') {
    const dx = Number(event.dx ?? 0);
    const dy = Number(event.dy ?? 0);
    const x = Number(event.x ?? 0);
    const y = Number(event.y ?? 0);
    return `Scroll dx=${dx}, dy=${dy} en (${x}, ${y})`;
  }
  if (type === 'key_down') {
    return `Tecla abajo: ${String(event.key || 'desconocida')}`;
  }
  if (type === 'key_up') {
    return `Tecla arriba: ${String(event.key || 'desconocida')}`;
  }

  return JSON.stringify(event);
};

const normalizeTriggerKey = (rawKey: string) => {
  const cleaned = rawKey.trim();
  if (!cleaned) return '';
  if (rawKey === ' ') return 'space';

  const lowered = cleaned.toLowerCase();
  if (lowered === 'escape') return 'esc';
  if (lowered === 'arrowup') return 'up';
  if (lowered === 'arrowdown') return 'down';
  if (lowered === 'arrowleft') return 'left';
  if (lowered === 'arrowright') return 'right';
  return lowered;
};

export function WorkSpaceMenu() {
  const { t } = useTranslation();
  const { chatStore } = useChatStoreAdapter();
  const workerList = useWorkerList();
  const [isMacroDialogOpen, setIsMacroDialogOpen] = useState(false);
  const [recordingName, setRecordingName] = useState('macro_demo');
  const [recordingDuration, setRecordingDuration] = useState('15');
  const [recordMode, setRecordMode] = useState<MacroRecordMode>('hotkey');
  const [startTriggerKey, setStartTriggerKey] = useState('f8');
  const [isSelectingTriggerKey, setIsSelectingTriggerKey] = useState(false);
  const [startWaitTimeout, setStartWaitTimeout] = useState('300');
  const [maxRecordingTime, setMaxRecordingTime] = useState('600');
  const [recordings, setRecordings] = useState<string[]>([]);
  const [selectedRecording, setSelectedRecording] = useState('');
  const [selectedRecordingDetail, setSelectedRecordingDetail] =
    useState<MacroRecordingDetail | null>(null);
  const [isLoadingRecordingDetail, setIsLoadingRecordingDetail] =
    useState(false);
  const [renameSourceName, setRenameSourceName] = useState('');
  const [renameTargetName, setRenameTargetName] = useState('');
  const [replaySpeed, setReplaySpeed] = useState('1');
  const [replayRepeatCount, setReplayRepeatCount] = useState('1');
  const [isMacroBusy, setIsMacroBusy] = useState(false);

  const baseWorker: Agent[] = useMemo(
    () => [
      {
        tasks: [],
        agent_id: 'developer_agent',
        name: t('layout.developer-agent'),
        type: 'developer_agent',
        log: [],
        activeWebviewIds: [],
      },
      {
        tasks: [],
        agent_id: 'browser_agent',
        name: t('layout.browser-agent'),
        type: 'browser_agent',
        log: [],
        activeWebviewIds: [],
      },
      {
        tasks: [],
        agent_id: 'multi_modal_agent',
        name: t('layout.multi-modal-agent'),
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
        name: t('layout.document-agent'),
        type: 'document_agent',
        log: [],
        activeWebviewIds: [],
      },
    ],
    [t]
  );

  const activeTaskId = chatStore?.activeTaskId as string;
  const taskAssigning = chatStore?.tasks[activeTaskId]?.taskAssigning;
  const webViewUrls = chatStore?.tasks[activeTaskId]?.webViewUrls;

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
        let webViewUrls = [
          ...chatStore.tasks[chatStore.activeTaskId as string].webViewUrls,
        ];
        let taskAssigning = [
          ...chatStore.tasks[chatStore.activeTaskId as string].taskAssigning,
        ];
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
                let taskAssigning = [
                  ...chatStore.tasks[chatStore.activeTaskId as string]
                    .taskAssigning,
                ];
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

  const selectRecording = (name: string) => {
    setSelectedRecording(name);
    setRenameSourceName(name);
    setRenameTargetName(name);
  };

  const loadRecordings = async (preferredRecording?: string) => {
    try {
      const res = await fetchGet('/automation/recordings');
      const list = Array.isArray(res?.recordings) ? res.recordings : [];
      setRecordings(list);

      let nextSelection = '';
      if (preferredRecording && list.includes(preferredRecording)) {
        nextSelection = preferredRecording;
      } else if (selectedRecording && list.includes(selectedRecording)) {
        nextSelection = selectedRecording;
      } else if (list.length > 0) {
        nextSelection = list[0];
      }

      if (nextSelection) {
        selectRecording(nextSelection);
      } else {
        setSelectedRecording('');
        setSelectedRecordingDetail(null);
        setRenameSourceName('');
        setRenameTargetName('');
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
      toast.error('No se pudo cargar la lista de macros');
      setRecordings([]);
      setSelectedRecording('');
      setSelectedRecordingDetail(null);
      setRenameSourceName('');
      setRenameTargetName('');
    }
  };

  useEffect(() => {
    if (!isMacroDialogOpen) return;
    void loadRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMacroDialogOpen]);

  useEffect(() => {
    if (!isMacroDialogOpen || recordMode !== 'hotkey') {
      setIsSelectingTriggerKey(false);
    }
  }, [isMacroDialogOpen, recordMode]);

  useEffect(() => {
    if (!isMacroDialogOpen || !selectedRecording) {
      setSelectedRecordingDetail(null);
      setIsLoadingRecordingDetail(false);
      return;
    }

    let isCancelled = false;

    const loadRecordingDetail = async () => {
      try {
        setIsLoadingRecordingDetail(true);
        const encodedName = encodeURIComponent(selectedRecording);
        const res = await fetchGet(`/automation/recording/${encodedName}`);
        if (!isCancelled) {
          if (res?.success && res?.recording) {
            setSelectedRecordingDetail(res.recording as MacroRecordingDetail);
          } else {
            setSelectedRecordingDetail(null);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load recording detail:', error);
          setSelectedRecordingDetail(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRecordingDetail(false);
        }
      }
    };

    void loadRecordingDetail();

    return () => {
      isCancelled = true;
    };
  }, [isMacroDialogOpen, selectedRecording]);

  const handleRecordMacro = async () => {
    const cleanName = recordingName.trim();
    const durationSeconds = Number(recordingDuration);
    const cleanTriggerKey = startTriggerKey.trim();
    const startWaitSeconds = Number(startWaitTimeout);
    const maxRecordSeconds = Number(maxRecordingTime);

    if (cleanName.length === 0) {
      toast.error('Ingresa un nombre para la macro');
      return;
    }
    if (recordMode === 'time') {
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        toast.error('La duracion debe ser mayor a 0 segundos');
        return;
      }
    } else {
      if (!cleanTriggerKey) {
        toast.error('Define una tecla para iniciar y terminar la grabacion');
        return;
      }
      if (!Number.isFinite(startWaitSeconds) || startWaitSeconds <= 0) {
        toast.error('El tiempo de espera para iniciar debe ser mayor a 0');
        return;
      }
      if (!Number.isFinite(maxRecordSeconds) || maxRecordSeconds <= 0) {
        toast.error('El tiempo maximo de grabacion debe ser mayor a 0');
        return;
      }
    }

    try {
      setIsMacroBusy(true);
      if (recordMode === 'hotkey') {
        toast.info(`Presiona ${cleanTriggerKey} para iniciar y terminar`);
      }
      const res = await fetchPost('/automation/record', {
        recording_name: cleanName,
        duration_seconds: recordMode === 'time' ? durationSeconds : 15,
        start_trigger_key: recordMode === 'hotkey' ? cleanTriggerKey : null,
        stop_trigger_key: recordMode === 'hotkey' ? cleanTriggerKey : null,
        start_wait_timeout_seconds:
          recordMode === 'hotkey' ? startWaitSeconds : 300,
        max_recording_seconds: recordMode === 'hotkey' ? maxRecordSeconds : 600,
      });

      if (res?.success) {
        toast.success(res?.message || 'Macro grabada');
        await loadRecordings(cleanName);
      } else {
        toast.error(res?.message || 'No se pudo grabar la macro');
      }
    } catch (error: any) {
      console.error('Failed to record macro:', error);
      toast.error(
        error?.message || 'Error grabando macro. Revisa permisos locales.'
      );
    } finally {
      setIsMacroBusy(false);
    }
  };

  const handleSelectTriggerKey = () => {
    if (isMacroBusy || recordMode !== 'hotkey') return;
    setIsSelectingTriggerKey(true);
    toast.info('Presione la tecla que desea seleccionar');
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isSelectingTriggerKey) return;

    event.preventDefault();
    event.stopPropagation();

    const selectedKey = normalizeTriggerKey(event.key);
    if (!selectedKey) return;

    setStartTriggerKey(selectedKey);
    setIsSelectingTriggerKey(false);
    toast.success(`Tecla seleccionada: ${selectedKey}`);
  };

  const handleReplayMacro = async (recordingNameOverride?: string) => {
    const cleanName = (recordingNameOverride || selectedRecording).trim();
    const speedMultiplier = Number(replaySpeed);
    const repeatCount = Number(replayRepeatCount);

    if (!cleanName) {
      toast.error('Selecciona una macro para reproducir');
      return;
    }
    if (!Number.isFinite(speedMultiplier) || speedMultiplier <= 0) {
      toast.error('La velocidad debe ser mayor que 0');
      return;
    }
    if (!Number.isInteger(repeatCount) || repeatCount < 1) {
      toast.error(
        'Las repeticiones deben ser un numero entero mayor o igual a 1'
      );
      return;
    }

    try {
      setIsMacroBusy(true);
      const res = await fetchPost('/automation/replay', {
        recording_name: cleanName,
        speed_multiplier: speedMultiplier,
        repeat_count: repeatCount,
      });

      if (res?.success) {
        toast.success(res?.message || 'Macro reproducida');
      } else {
        toast.error(res?.message || 'No se pudo reproducir la macro');
      }
    } catch (error: any) {
      console.error('Failed to replay macro:', error);
      toast.error(error?.message || 'Error reproduciendo macro');
    } finally {
      setIsMacroBusy(false);
    }
  };

  const handleRenameMacro = async () => {
    const sourceName = (renameSourceName || selectedRecording).trim();
    const targetName = renameTargetName.trim();

    if (!sourceName) {
      toast.error('Selecciona una macro para editar');
      return;
    }
    if (!targetName) {
      toast.error('Ingresa el nuevo nombre');
      return;
    }
    if (sourceName === targetName) {
      toast.error('El nuevo nombre debe ser diferente');
      return;
    }

    try {
      setIsMacroBusy(true);
      const res = await fetchPut('/automation/recording/rename', {
        old_name: sourceName,
        new_name: targetName,
      });
      if (res?.success) {
        toast.success(res?.message || 'Macro renombrada');
        await loadRecordings(targetName);
      } else {
        toast.error(res?.message || 'No se pudo renombrar la macro');
      }
    } catch (error: any) {
      console.error('Failed to rename macro:', error);
      toast.error(error?.message || 'Error renombrando macro');
    } finally {
      setIsMacroBusy(false);
    }
  };

  const handleDeleteMacro = async (recordingNameToDelete?: string) => {
    const targetName = (recordingNameToDelete || selectedRecording).trim();
    if (!targetName) {
      toast.error('Selecciona una macro para borrar');
      return;
    }

    const accepted = window.confirm(
      `Se borrara la macro "${targetName}". Deseas continuar?`
    );
    if (!accepted) return;

    try {
      setIsMacroBusy(true);
      const encodedName = encodeURIComponent(targetName);
      const res = await fetchDelete(`/automation/recording/${encodedName}`);
      if (res?.success) {
        toast.success(res?.message || 'Macro eliminada');
        await loadRecordings();
      } else {
        toast.error(res?.message || 'No se pudo eliminar la macro');
      }
    } catch (error: any) {
      console.error('Failed to delete macro:', error);
      toast.error(error?.message || 'Error eliminando macro');
    } finally {
      setIsMacroBusy(false);
    }
  };

  if (!chatStore) {
    return <div>Loading...</div>;
  }

  const recordingEvents = Array.isArray(selectedRecordingDetail?.events)
    ? selectedRecordingDetail.events
    : [];

  const agentMap = {
    developer_agent: {
      name: t('layout.developer-agent'),
      icon: <CodeXml size={16} className="text-text-primary" />,
      textColor: 'text-text-developer',
      bgColor: 'bg-bg-fill-coding-active',
      shapeColor: 'bg-bg-fill-coding-default',
      borderColor: 'border-bg-fill-coding-active',
      bgColorLight: 'bg-emerald-200',
    },
    browser_agent: {
      name: t('layout.browser-agent'),
      icon: <Globe size={16} className="text-text-primary" />,
      textColor: 'text-blue-700',
      bgColor: 'bg-bg-fill-browser-active',
      shapeColor: 'bg-bg-fill-browser-default',
      borderColor: 'border-bg-fill-browser-active',
      bgColorLight: 'bg-blue-200',
    },
    document_agent: {
      name: t('layout.document-agent'),
      icon: <FileText size={16} className="text-text-primary" />,
      textColor: 'text-yellow-700',
      bgColor: 'bg-bg-fill-writing-active',
      shapeColor: 'bg-bg-fill-writing-default',
      borderColor: 'border-bg-fill-writing-active',
      bgColorLight: 'bg-yellow-200',
    },
    multi_modal_agent: {
      name: t('layout.multi-modal-agent'),
      icon: <Image size={16} className="text-text-primary" />,
      textColor: 'text-fuchsia-700',
      bgColor: 'bg-bg-fill-multimodal-active',
      shapeColor: 'bg-bg-fill-multimodal-default',
      borderColor: 'border-bg-fill-multimodal-active',
      bgColorLight: 'bg-fuchsia-200',
    },
    social_media_agent: {
      name: t('layout.social-media-agent'),
      icon: <Bird size={16} className="text-text-primary" />,
      textColor: 'text-purple-700',
      bgColor: 'bg-violet-700',
      shapeColor: 'bg-violet-300',
      borderColor: 'border-violet-700',
      bgColorLight: 'bg-purple-50',
    },
  };
  const agentIconMap = {
    developer_agent: (
      <CodeXml
        className={`!h-[10px] !w-[10px] ${agentMap.developer_agent.textColor}`}
      />
    ),
    browser_agent: (
      <Globe
        className={`!h-[10px] !w-[10px] ${agentMap.browser_agent.textColor}`}
      />
    ),
    document_agent: (
      <FileText
        className={`!h-[10px] !w-[10px] ${agentMap.document_agent.textColor}`}
      />
    ),
    multi_modal_agent: (
      <Image
        className={`!h-[10px] !w-[10px] ${agentMap.multi_modal_agent.textColor}`}
      />
    ),
    social_media_agent: (
      <Bird
        className={`!h-[10px] !w-[10px] ${agentMap.social_media_agent.textColor}`}
      />
    ),
  };

  const onValueChange = (val: string) => {
    if (!chatStore.activeTaskId) return;
    if (val === '') {
      chatStore.setActiveWorkSpace(chatStore.activeTaskId, 'workflow');
      return;
    }
    if (val === 'documentWorkSpace') {
      chatStore.setNuwFileNum(chatStore.activeTaskId, 0);
    }
    chatStore.setActiveWorkSpace(chatStore.activeTaskId, val);

    window.electronAPI.hideAllWebview();
  };

  return (
    <div className="h-full">
      <div className="flex-start flex h-full items-center">
        <div className="flex-start mr-3 flex items-center gap-1">
          {chatStore.activeTaskId && (
            <ToggleGroup
              type="single"
              size="sm"
              value={
                chatStore.tasks[chatStore.activeTaskId as string]
                  .activeWorkSpace as string
              }
              onValueChange={onValueChange}
              className="flex items-center gap-2"
            >
              <ToggleGroupItem value="workflow" className="!h-10 !w-10 p-2">
                <LayoutGrid className="!h-6 !w-6" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="documentWorkSpace"
                className="relative !h-10 !w-10 p-2"
              >
                {chatStore.tasks[chatStore.activeTaskId as string].nuwFileNum >
                  0 && (
                  <Badge
                    className="absolute right-0.5 top-0.5 h-4 min-w-4 rounded-full bg-icon-cuation px-1 font-mono tabular-nums text-white-100%"
                    variant="destructive"
                  >
                    {
                      chatStore.tasks[chatStore.activeTaskId as string]
                        .nuwFileNum
                    }
                  </Badge>
                )}
                <Inbox className="!h-6 !w-6" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
        {/* activeAgent */}
        <AnimatePresence>
          {agentList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={`border-[0px] border-l border-solid border-white-100% px-3`}
            >
              <ToggleGroup
                type="single"
                value={
                  chatStore.tasks[chatStore.activeTaskId as string]
                    .activeWorkSpace as string
                }
                onValueChange={onValueChange}
                className="scrollbar-horizontal flex max-w-[500px] items-center gap-2 overflow-x-auto"
              >
                <AnimatePresence mode="popLayout">
                  {agentList.map((agent) => (
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
                      <ToggleGroupItem
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
                        aria-label="Toggle bold"
                        className={`relative !h-10 !w-10 !p-2 hover:bg-white-100% ${
                          agent.tasks.length === 0 && 'opacity-30'
                        }`}
                      >
                        <Bot className={`!h-6 !w-6`} />
                        <div className="absolute right-1 top-0">
                          {
                            agentIconMap[
                              agent.type as keyof typeof agentIconMap
                            ]
                          }
                        </div>
                      </ToggleGroupItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ToggleGroup>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mr-3 h-full w-[1px] bg-white-100%"></div>
        <Button
          onClick={() => setIsMacroDialogOpen(true)}
          variant="ghost"
          className="mr-2"
        >
          <MousePointerClick className="h-6 w-6 text-icon-primary" />
          <span className="text-[13px] font-bold leading-13 text-text-body">
            Macro IA
          </span>
        </Button>
        <AddWorker />
      </div>
      <Dialog open={isMacroDialogOpen} onOpenChange={setIsMacroDialogOpen}>
        <DialogContent
          size="lg"
          className="max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1rem)] max-w-[1100px] gap-0 overflow-hidden p-0"
          showCloseButton={!isMacroBusy}
        >
          <DialogHeader
            title="Automatizador de Pasos"
            subtitle="Lista de macros a la izquierda y panel de configuracion a la derecha."
          />
          <DialogContentSection className="scrollbar overflow-y-auto bg-white-100% p-md">
            <div className="grid min-h-0 gap-4 md:grid-cols-12">
              <div className="flex min-h-[300px] flex-col rounded-xl border border-solid border-input-border-default bg-input-bg-default md:order-2 md:col-span-5 md:min-h-[420px]">
                <div className="flex items-center justify-between border-b border-solid border-input-border-default px-3 py-2">
                  <span className="text-sm font-bold text-text-heading">
                    Lista de macros
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadRecordings()}
                    disabled={isMacroBusy}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Actualizar
                  </Button>
                </div>

                <div className="scrollbar max-h-[220px] flex-1 space-y-2 overflow-y-auto p-2 md:max-h-[360px]">
                  {recordings.length === 0 && (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-input-border-default px-3 py-4 text-center text-xs font-medium text-text-label">
                      No hay macros guardadas
                    </div>
                  )}

                  {recordings.map((recording) => (
                    <div
                      key={recording}
                      className={`flex items-center justify-between rounded-lg border border-solid px-2 py-2 transition-all ${
                        selectedRecording === recording
                          ? 'border-input-border-focus bg-input-bg-input'
                          : 'border-input-border-default bg-input-bg-default'
                      }`}
                    >
                      <button
                        type="button"
                        className="mr-2 flex-1 truncate text-left text-sm font-semibold text-text-body"
                        onClick={() => selectRecording(recording)}
                        disabled={isMacroBusy}
                      >
                        {recording}
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleReplayMacro(recording);
                          }}
                          disabled={isMacroBusy}
                          title="Ejecutar"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectRecording(recording);
                          }}
                          disabled={isMacroBusy}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteMacro(recording);
                          }}
                          disabled={isMacroBusy}
                          title="Borrar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-3 md:order-1 md:col-span-7">
                <div className="rounded-xl border border-solid border-input-border-default bg-input-bg-default p-3">
                  <div className="mb-2 text-sm font-bold text-text-heading">
                    Grabar nueva macro
                  </div>
                  <div className="grid gap-2">
                    <Input
                      title="Nombre macro"
                      value={recordingName}
                      onChange={(e) => setRecordingName(e.target.value)}
                      placeholder="ejemplo_login_crm"
                      disabled={isMacroBusy}
                    />
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-semibold text-text-label">
                        Modo de grabacion
                      </div>
                      <ToggleGroup
                        type="single"
                        value={recordMode}
                        onValueChange={(value) => {
                          if (value === 'time' || value === 'hotkey') {
                            setRecordMode(value);
                          }
                        }}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="hotkey" className="!h-8 px-3">
                          Por teclas
                        </ToggleGroupItem>
                        <ToggleGroupItem value="time" className="!h-8 px-3">
                          Por tiempo
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    {recordMode === 'time' ? (
                      <Input
                        title="Duracion (seg)"
                        type="number"
                        value={recordingDuration}
                        onChange={(e) => setRecordingDuration(e.target.value)}
                        disabled={isMacroBusy}
                      />
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <Input
                            title="Tecla inicio/fin"
                            value={startTriggerKey}
                            onClick={handleSelectTriggerKey}
                            onFocus={handleSelectTriggerKey}
                            onKeyDown={handleTriggerKeyDown}
                            note={
                              isSelectingTriggerKey
                                ? 'Presione la tecla que desea seleccionar.'
                                : 'Haz click para seleccionar la tecla.'
                            }
                            placeholder="Haz click y presiona una tecla"
                            readOnly
                            disabled={isMacroBusy}
                            className="cursor-pointer"
                          />
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <Input
                            title="Espera inicio max (seg)"
                            type="number"
                            value={startWaitTimeout}
                            onChange={(e) => setStartWaitTimeout(e.target.value)}
                            disabled={isMacroBusy}
                          />
                          <Input
                            title="Grabacion max (seg)"
                            type="number"
                            value={maxRecordingTime}
                            onChange={(e) => setMaxRecordingTime(e.target.value)}
                            disabled={isMacroBusy}
                          />
                        </div>
                      </>
                    )}
                    <div className="flex items-end justify-end">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleRecordMacro}
                        disabled={isMacroBusy}
                      >
                        {isMacroBusy ? 'Procesando...' : 'Grabar'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-solid border-input-border-default bg-input-bg-default p-3">
                  <div className="mb-2 text-sm font-bold text-text-heading">
                    Editar macro
                  </div>
                  <div className="grid gap-2">
                    <Input
                      title="Macro seleccionada"
                      value={renameSourceName}
                      onChange={(e) => setRenameSourceName(e.target.value)}
                      placeholder="Selecciona una macro a la izquierda"
                      disabled={isMacroBusy}
                    />
                    <Input
                      title="Nuevo nombre"
                      value={renameTargetName}
                      onChange={(e) => setRenameTargetName(e.target.value)}
                      placeholder="nuevo_nombre_macro"
                      disabled={isMacroBusy}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRenameMacro}
                      disabled={isMacroBusy || !renameSourceName}
                    >
                      <Pencil className="h-4 w-4" />
                      Renombrar
                    </Button>
                    <div className="mt-2 rounded-lg border border-solid border-input-border-default bg-input-bg-input p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-text-heading">
                          Acciones grabadas
                        </span>
                        {isLoadingRecordingDetail && (
                          <span className="text-[11px] font-medium text-text-label">
                            Cargando...
                          </span>
                        )}
                      </div>

                      {selectedRecordingDetail && (
                        <div className="mb-2 text-[11px] font-medium text-text-label">
                          Duracion:{' '}
                          {Number(selectedRecordingDetail.duration_seconds || 0).toFixed(
                            3
                          )}
                          s | Inicio:{' '}
                          {selectedRecordingDetail.trigger_keys?.start || '-'} |
                          Fin:{' '}
                          {selectedRecordingDetail.trigger_keys?.stop || '-'}
                        </div>
                      )}

                      <div className="scrollbar max-h-[170px] space-y-1 overflow-y-auto">
                        {!selectedRecording && (
                          <div className="rounded-md border border-dashed border-input-border-default px-2 py-2 text-xs font-medium text-text-label">
                            Selecciona una macro para ver sus acciones.
                          </div>
                        )}
                        {selectedRecording &&
                          !isLoadingRecordingDetail &&
                          recordingEvents.length === 0 && (
                            <div className="rounded-md border border-dashed border-input-border-default px-2 py-2 text-xs font-medium text-text-label">
                              Esta macro no tiene acciones registradas.
                            </div>
                          )}
                        {selectedRecording &&
                          !isLoadingRecordingDetail &&
                          recordingEvents.map((event, index) => (
                            <div
                              key={`event-${index}-${String(event.type || 'unknown')}`}
                              className="rounded-md border border-solid border-input-border-default px-2 py-1"
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-text-heading">
                                <span>
                                  {index + 1}. {String(event.type || 'unknown')}
                                </span>
                                <span>+{formatEventDelay(event.delay)}s</span>
                              </div>
                              <div className="text-xs font-medium text-text-body">
                                {describeMacroEvent(event)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-solid border-input-border-default bg-input-bg-default p-3">
                  <div className="mb-2 text-sm font-bold text-text-heading">
                    Ejecutar macro
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      title="Velocidad x"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={replaySpeed}
                      onChange={(e) => setReplaySpeed(e.target.value)}
                      disabled={isMacroBusy}
                    />
                    <Input
                      title="Repeticiones"
                      type="number"
                      min="1"
                      step="1"
                      value={replayRepeatCount}
                      onChange={(e) => setReplayRepeatCount(e.target.value)}
                      disabled={isMacroBusy}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onClick={() => void handleReplayMacro()}
                    disabled={isMacroBusy || !selectedRecording}
                  >
                    <Play className="h-4 w-4" />
                    {isMacroBusy
                      ? 'Procesando...'
                      : `Reproducir ${
                          selectedRecording || 'macro seleccionada'
                        }`}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContentSection>
        </DialogContent>
      </Dialog>
    </div>
  );
}



