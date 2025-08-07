'use client';

import type { Attachment, Message, UIMessage } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
  startTransition,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { cn, generateUUID } from '@/lib/utils';
import {
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from '@/lib/constants';
import {
  extractTextFromDocument,
  isSupportedDocumentFormat,
  getFileTypeDescription,
} from '@/lib/utils/document-parser';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import { UseChatHelpers } from '@ai-sdk/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useRouter } from 'next/navigation';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  isWithTestInsert,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  isWithTestInsert?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    `input-${chatId}`,
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 && attachments.length === 0 && (
        <SuggestedActions append={append} chatId={chatId} />
      )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        accept=".pdf,.docx,.doc,.pptx,.txt"
        tabIndex={-1}
      />

      {attachments.length > 0 && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}
        </div>
      )}

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Введите сообщение... (Shift + Enter для новой строки)"
        value={input}
        onChange={handleInput}
        className={cx(
          'min-h-[24px] max-h-[400px] overflow-y-auto overflow-x-hidden resize-none rounded-2xl !text-base bg-muted pb-10 dark:border-zinc-700',
          className,
        )}
        rows={2}
        autoFocus
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();

            if (status !== 'ready') {
              toast.error(
                'Пожалуйста, подождите, пока модель закончит свой ответ!',
              );
            } else {
              submitForm();
            }
          }
        }}
      />

      <div className="absolute bottom-0 p-2 w-fit flex flex-row justify-start">
        <AttachmentsButton
          fileInputRef={fileInputRef}
          status={status}
          isWithTestInsert={isWithTestInsert}
          chatId={chatId}
          // TODO add functionality to set title
          title={'Мой тест'}
          content={'...'}
          setMessages={setMessages}
          messages={messages}
        />
      </div>

      <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
        {status === 'submitted' ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton input={input} submitForm={submitForm} />
        )}
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
  isWithTestInsert,
  chatId,
  title,
  content,
  setMessages,
  messages,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
  isWithTestInsert?: boolean;
  chatId: string;
  title?: string;
  content?: string;
  setMessages: UseChatHelpers['setMessages'];
  messages: Array<UIMessage>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [hasDocuments, setHasDocuments] = useState(false);

  const handleInsertTest = useCallback(async () => {
    if (!isWithTestInsert || !chatId || !title || !content) return;
    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create test');
      }

      const result: any = await response.json();

      const { chatId: testChatId, isNewChat, savedMessage } = result;
      if (isNewChat) {
        toast.success('Тест успешно создан');
        router.push(`/chat/${testChatId}`);
      } else {
        toast.success('Тест успешно добавлен');
        if (savedMessage) {
          setMessages([...messages, savedMessage]);
        }
      }
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error('Не удалось создать тест');
    }
  }, [isWithTestInsert, chatId, title, content, messages, setMessages]);

  const handlePdfFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      // Validate all files are supported document formats
      const invalidFiles = files.filter(
        (file) => !isSupportedDocumentFormat(file),
      );

      if (invalidFiles.length > 0) {
        toast.error(
          'Пожалуйста, выберите только поддерживаемые документы (PDF, DOCX, DOC, PPTX, TXT).',
        );
        if (event.target) event.target.value = '';
        return;
      }

      if (event.target) event.target.value = '';

      const loadingToastId = toast.loading(
        `Извлечение текста из ${files.length} документов...`,
      );

      try {
        // Process all files in sequence
        const savedMessages: any[] = [];
        let isNewChat = false;
        let newChatId = chatId;

        for (const file of files) {
          let extractedText: string | null = null;
          try {
            extractedText = await extractTextFromDocument(file);
          } catch (error) {
            console.error('Document Parsing error:', error);
            toast.error(
              `Ошибка извлечения текста из ${file.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
              { id: loadingToastId },
            );
            continue;
          }

          if (extractedText === null || extractedText.trim() === '') {
            toast.error(
              `Не удалось извлечь текст из ${file.name}. Возможно, он содержит только изображения или текст нераспознаваем.`,
              { id: loadingToastId },
            );
            continue;
          }

          toast.loading(`Сохранение учебного материала ${file.name}...`, {
            id: loadingToastId,
          });
          const apiUrl = `/api/document/document?chatId=${newChatId}`;
          const requestBody = {
            chatId: newChatId,
            content: extractedText,
            title: file.name || getFileTypeDescription(file),
          };

          try {
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              let errorData = {};
              try {
                errorData = await response.json();
              } catch (jsonError) {
                console.error(
                  'Failed to parse API error response as JSON',
                  jsonError,
                );
                errorData = {
                  error: `Request failed with status ${response.status}`,
                };
              }
              throw new Error(
                (errorData as any)?.error ||
                  `Failed to create educational material (${response.status})`,
              );
            }

            const result = await response.json();

            if (result.savedMessage) {
              if (result.isNewChat) {
                isNewChat = true;
                newChatId = result.chatId;
              }
              savedMessages.push(result.savedMessage);
            }
          } catch (error: any) {
            console.error('Document Creation/API Fetch Error:', error);
            toast.error(
              `Ошибка сохранения учебного материала ${file.name}: ${error.message}`,
              {
                id: loadingToastId,
              },
            );
          }
        }

        // Add all saved messages to chat at once
        if (savedMessages.length > 0) {
          if (isNewChat) {
            toast.success('Учебные материалы успешно созданы', {
              id: loadingToastId,
            });
            router.push(`/chat/${newChatId}`);
          } else {
            setMessages([...messages, ...savedMessages]);
            toast.success(
              `${savedMessages.length} учебных материалов успешно созданы и добавлены в чат.`,
              {
                id: loadingToastId,
              },
            );
          }
        }
      } finally {
        toast.dismiss(loadingToastId);
      }
    },
    [chatId, setMessages, messages, router],
  );

  // Check if documents exist for this chat
  useEffect(() => {
    if (!chatId) return;

    const checkForDocuments = async () => {
      try {
        const response = await fetch(
          `/api/chat/documents/check?chatId=${chatId}`,
        );

        if (response.ok) {
          const data = await response.json();
          setHasDocuments(data.hasDocuments);
        }
      } catch (error) {
        console.error('Error checking for documents:', error);
      }
    };

    checkForDocuments();
  }, [chatId, messages]); // Re-check when messages change

  return (
    <>
      <input
        type="file"
        ref={pdfInputRef}
        className="hidden"
        accept={[
          ...SUPPORTED_DOCUMENT_TYPES,
          ...SUPPORTED_DOCUMENT_EXTENSIONS,
        ].join(',')}
        onChange={handlePdfFileChange}
        multiple={true}
        tabIndex={-1}
      />

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild
          className={cn(
            'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          )}
        >
          <Button
            data-testid="attachments-button"
            className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
            disabled={status !== 'ready'}
            variant="ghost"
          >
            <PaperclipIcon size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          sideOffset={10}
          align="start"
          className="w-[240px]"
        >
          {/* <DropdownMenuItem
            onSelect={() => {
              setOpen(false);
              startTransition(() => {
                fileInputRef.current?.click();
              });
            }}
            asChild
          >
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between p-2 hover:bg-accent"
              disabled={status !== 'ready'}
            >
              <div>Загрузить изображение</div>
              <div className="text-xs text-muted-foreground"></div>
            </button>
          </DropdownMenuItem> */}
          <DropdownMenuItem
            onSelect={() => {
              setOpen(false);
              startTransition(() => {
                pdfInputRef.current?.click();
              });
            }}
            asChild
            disabled={hasDocuments || status !== 'ready'}
          >
            <button
              type="button"
              className="gap-4 group/item flex flex-row justify-between items-center w-full cursor-pointer text-left"
              disabled={hasDocuments || status !== 'ready'}
            >
              <div className="flex flex-col gap-1 items-start">
                <div>
                  {hasDocuments
                    ? 'В этом чате уже есть учебные материалы'
                    : 'Загрузить учебный материал'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {hasDocuments ? '' : 'Текст будет извлечен'}
                </div>
              </div>
            </button>
          </DropdownMenuItem>
          {isWithTestInsert && chatId && title && content && !hasDocuments && (
            <DropdownMenuItem
              onSelect={() => {
                setOpen(false);
                startTransition(handleInsertTest);
              }}
              asChild
              disabled={hasDocuments || status !== 'ready'}
            >
              <button
                type="button"
                className="gap-4 group/item flex flex-row justify-between items-center w-full cursor-pointer text-left"
                disabled={hasDocuments || status !== 'ready'}
              >
                <div className="flex flex-col gap-1 items-start">
                  <div>Создать тест</div>
                  <div className="text-xs text-muted-foreground">
                    В виде текста
                  </div>
                </div>
              </button>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
}: {
  submitForm: () => void;
  input: string;
}) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
