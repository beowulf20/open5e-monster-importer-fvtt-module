import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Badge,
  Box,
  Button,
  ChakraProvider,
  Flex,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  Spinner,
  Stack,
  Text,
  VStack,
  defaultSystem
} from '@chakra-ui/react';

const PACKS = [
  { value: '', label: 'All packs' },
  { value: 'classes', label: 'Classes' },
  { value: 'subclasses', label: 'Subclasses' },
  { value: 'features', label: 'Features' },
  { value: 'items', label: 'Items' },
  { value: 'spells', label: 'Spells' }
];

const STATUSES = [
  { value: 'missing', label: 'Missing' },
  { value: 'approved', label: 'Approved' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'all', label: 'All' }
];

const REASONING_EFFORTS = [
  { value: 'none', label: 'Thinking off' },
  { value: 'medium', label: 'Thinking medium' },
  { value: 'high', label: 'Thinking high' }
];

const SAVE_MODES = [
  { value: 'manual', label: 'Approve manually' },
  { value: 'auto', label: 'Auto approve' }
];

const PARALLEL_OPTIONS = [1, 2, 3, 4, 5, 6];
const QUEUE_PAGE_SIZE = 50;
const RESULTS_PAGE_SIZE = 50;

const modulePreviewPath = (value = '') => {
  if (value.startsWith('modules/monster-creator/')) {
    return value.replace(/^modules\/monster-creator/, '/monster-creator');
  }
  if (value.startsWith('icons/')) {
    return '';
  }
  return value;
};

const jsonFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }
  return payload;
};

const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const readSseStream = async (response, onEvent) => {
  if (!response.ok) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let dataLines = [];

  const flush = () => {
    if (!dataLines.length) return;
    const raw = dataLines.join('\n');
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }
    onEvent({ event: eventName, data });
    eventName = 'message';
    dataLines = [];
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
    }

    let lineEnd;
    while ((lineEnd = buffer.search(/\r?\n/)) !== -1) {
      const line = buffer.slice(0, lineEnd);
      const nextIndex = lineEnd + (buffer[lineEnd] === '\r' && buffer[lineEnd + 1] === '\n' ? 2 : 1);
      buffer = buffer.slice(nextIndex);
      if (!line) {
        flush();
      } else if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }

    if (done) break;
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) {
      if (!line) {
        flush();
      } else if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }
  }
  flush();
};

const buildPromptCopy = (item) => {
  if (!item) return '';
  const parts = [
    `Name: ${item.name || 'Unknown item'}`,
    `Type: ${item.type || 'unknown'}`,
    item.sourceBook ? `Source: ${item.sourceBook}` : '',
    '',
    item.description ? `Description:\n${item.description}` : 'Description:'
  ].filter((part) => part !== '');
  return parts.join('\n');
};

function FieldLabel({ children }) {
  return (
    <Text as="label" color="gray.500" fontSize="11px" fontWeight="700" textTransform="uppercase">
      {children}
    </Text>
  );
}

function NativeSelect({ value, onChange, children }) {
  return (
    <Box
      as="select"
      value={value}
      onChange={onChange}
      borderWidth="1px"
      borderColor="gray.700"
      bg="gray.950"
      color="gray.100"
      h="34px"
      px="10px"
      borderRadius="6px"
      fontSize="13px"
    >
      {children}
    </Box>
  );
}

function QueueList({ items, selectedId, generationStatusById, onSelect }) {
  return (
    <VStack align="stretch" gap="1px" overflowY="auto" h="100%">
      {items.map((item, index) => {
        const generationStatus = generationStatusById[item.queueId];
        return (
          <Button
            key={item.queueId}
            justifyContent="flex-start"
            h="auto"
            minH="58px"
            px="12px"
            py="8px"
            borderRadius="0"
            variant="ghost"
            bg={item.queueId === selectedId ? 'gray.800' : 'transparent'}
            color="gray.100"
            onClick={() => onSelect(item.queueId)}
          >
            <Box textAlign="left" minW="0">
              <HStack gap="2" mb="1" flexWrap="wrap">
                <Text fontSize="12px" color="gray.500" w="34px">{index + 1}</Text>
                <Badge colorPalette={item.status === 'approved' ? 'green' : item.status === 'skipped' ? 'yellow' : 'red'}>
                  {item.packKey}
                </Badge>
                {generationStatus && (
                  <Badge colorPalette={['done', 'approved'].includes(generationStatus.state) ? 'green' : generationStatus.state === 'error' ? 'red' : 'blue'}>
                    {generationStatus.state}
                  </Badge>
                )}
              </HStack>
              <Text fontSize="13px" fontWeight="700" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {item.name}
              </Text>
              <Text fontSize="12px" color="gray.500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {item.type} · {item.sourceBook || 'Unknown source'}
              </Text>
            </Box>
          </Button>
        );
      })}
    </VStack>
  );
}

function DropZone({ imageDataUrl, urlValue, currentImg, onFile, onPaste, onUrlChange, onUrlUse }) {
  const fileInput = useRef(null);
  const preview = imageDataUrl || urlValue || modulePreviewPath(currentImg || '');

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.700"
      bg="gray.950"
      minH="360px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      onPaste={onPaste}
      onDragOver={(event) => event.preventDefault()}
      onDrop={async (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) await onFile(file);
      }}
      tabIndex={0}
    >
      {preview ? (
        <Image src={preview} alt="" maxH="330px" maxW="100%" objectFit="contain" />
      ) : (
        <Stack align="center" color="gray.500" gap="2">
          <Text fontSize="18px" fontWeight="700">Paste, drop, or URL</Text>
          <Text fontSize="13px">PNG, JPEG, WebP, GIF up to 10 MB</Text>
        </Stack>
      )}

      <Stack position="absolute" bottom="12px" left="12px" right="12px" gap="2">
        <HStack gap="2">
          <Button size="sm" onClick={() => fileInput.current?.click()}>Choose file</Button>
          <Input
            value={urlValue}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://example.com/icon.webp"
            bg="blackAlpha.700"
            borderColor="gray.700"
            size="sm"
          />
          <Button size="sm" onClick={onUrlUse} disabled={!urlValue.trim()}>Use URL</Button>
        </HStack>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await onFile(file);
            event.target.value = '';
          }}
        />
      </Stack>
    </Box>
  );
}

function GenerationResults({
  items,
  generationItemsById,
  generatedById,
  generationStatusById,
  selectedId,
  page,
  onPageChange,
  onSelect
}) {
  const itemById = new Map([
    ...items.map((item) => [item.queueId, item]),
    ...Object.values(generationItemsById).map((item) => [item.queueId, item])
  ]);
  const ids = [...new Set([...Object.keys(generationStatusById), ...Object.keys(generatedById)])];
  const allItems = ids.map((queueId) => itemById.get(queueId)).filter(Boolean);
  if (!allItems.length) return null;

  const pageCount = Math.max(1, Math.ceil(allItems.length / RESULTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);
  const visibleItems = allItems.slice(safePage * RESULTS_PAGE_SIZE, (safePage + 1) * RESULTS_PAGE_SIZE);

  return (
    <Box>
      <HStack justify="space-between" align="center" mb="2">
        <Box>
          <FieldLabel>Generation results</FieldLabel>
          <Text color="gray.500" fontSize="12px">
            {safePage * RESULTS_PAGE_SIZE + 1}-{safePage * RESULTS_PAGE_SIZE + visibleItems.length} of {allItems.length}
          </Text>
        </Box>
        <HStack gap="1">
          <Button size="xs" variant="outline" disabled={safePage === 0} onClick={() => onPageChange(safePage - 1)}>Prev</Button>
          <Button size="xs" variant="outline" disabled={safePage >= pageCount - 1} onClick={() => onPageChange(safePage + 1)}>Next</Button>
        </HStack>
      </HStack>
      <Grid mt="2" templateColumns="repeat(auto-fill, minmax(120px, 1fr))" gap="2">
        {visibleItems.map((item) => {
          const generated = generatedById[item.queueId];
          const status = generationStatusById[item.queueId];
          const state = status?.state || (generated ? 'done' : 'queued');
          return (
            <Box
              key={item.queueId}
              as="button"
              type="button"
              onClick={() => onSelect(item.queueId)}
              borderWidth="1px"
              borderColor={item.queueId === selectedId ? 'blue.400' : 'gray.700'}
              bg="gray.950"
              borderRadius="6px"
              overflow="hidden"
              textAlign="left"
            >
              <Box h="96px" bg="black" display="flex" alignItems="center" justifyContent="center">
                {generated?.dataUrl ? (
                  <Image src={generated.dataUrl} alt="" w="100%" h="100%" objectFit="cover" />
                ) : state === 'running' ? (
                  <Spinner size="sm" />
                ) : (
                  <Text color="gray.500" fontSize="12px">{state}</Text>
                )}
              </Box>
              <Box p="2">
                <HStack gap="1" mb="1">
                  <Badge size="sm" colorPalette={['done', 'approved'].includes(state) ? 'green' : state === 'error' ? 'red' : 'blue'}>
                    {state}
                  </Badge>
                </HStack>
                <Text fontSize="12px" fontWeight="700" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {item.name}
                </Text>
                {status?.message && (
                  <Text color="gray.500" fontSize="11px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {status.message}
                  </Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
}

function App() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState('missing');
  const [pack, setPack] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Ready');
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [queueingFilter, setQueueingFilter] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [imageKind, setImageKind] = useState('');
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [reasoningEffort, setReasoningEffort] = useState('none');
  const [saveMode, setSaveMode] = useState('manual');
  const [generationConcurrency, setGenerationConcurrency] = useState(3);
  const [generationQueue, setGenerationQueue] = useState([]);
  const [runningIds, setRunningIds] = useState([]);
  const [generationItemsById, setGenerationItemsById] = useState({});
  const [generatedById, setGeneratedById] = useState({});
  const [generationStatusById, setGenerationStatusById] = useState({});
  const [generationResultsPage, setGenerationResultsPage] = useState(0);

  const itemsRef = useRef([]);
  const selectedIdRef = useRef('');
  const reasoningEffortRef = useRef(reasoningEffort);
  const saveModeRef = useRef(saveMode);
  const generationConcurrencyRef = useRef(generationConcurrency);
  const generationQueueRef = useRef([]);
  const generationItemsByIdRef = useRef({});
  const runningIdsRef = useRef(new Set());
  const queuePumpActiveRef = useRef(false);

  const selected = useMemo(() => items.find((item) => item.queueId === selectedId) || items[0] || null, [items, selectedId]);
  const selectedGenerationStatus = selected ? generationStatusById[selected.queueId] : null;
  const selectedIsQueuedOrRunning = selectedGenerationStatus?.state === 'queued' || selectedGenerationStatus?.state === 'running';
  const queuedCount = generationQueue.length;
  const runningCount = runningIds.length;

  useEffect(() => {
    setGenerationResultsPage(0);
  }, [status, pack, query]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    reasoningEffortRef.current = reasoningEffort;
  }, [reasoningEffort]);

  useEffect(() => {
    saveModeRef.current = saveMode;
  }, [saveMode]);

  useEffect(() => {
    generationConcurrencyRef.current = generationConcurrency;
    setTimeout(() => pumpGenerationQueue(), 0);
  }, [generationConcurrency]);

  useEffect(() => {
    generationItemsByIdRef.current = generationItemsById;
  }, [generationItemsById]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      if (pack) params.set('pack', pack);
      if (query.trim()) params.set('q', query.trim());
      params.set('limit', String(QUEUE_PAGE_SIZE));
      params.set('offset', String(offset));
      const payload = await jsonFetch(`/api/fc5-icons/queue?${params.toString()}`);
      setItems(payload.items || []);
      setTotalCount(payload.count || 0);
      setHasNext(Boolean(payload.hasNext));
      setHasPrevious(Boolean(payload.hasPrevious));
      setSelectedId((current) => (payload.items || []).some((item) => item.queueId === current)
        ? current
        : (payload.items?.[0]?.queueId || ''));
      setMessage(`${payload.count || 0} records · showing ${(payload.items || []).length}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [status, pack, offset]);

  useEffect(() => {
    setOffset(0);
    const timeout = setTimeout(loadQueue, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [status, pack]);

  useEffect(() => {
    const generated = generatedById[selectedId];
    setImageDataUrl(generated?.dataUrl || '');
    setUrlValue('');
    setImageKind(generated?.dataUrl ? 'data-url' : '');
    setRevisedPrompt(generated?.revisedPrompt || '');
  }, [selectedId, generatedById]);

  const setFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      setMessage('Dropped file is not an image.');
      return;
    }
    if (selectedId) {
      setGeneratedById((current) => {
        const next = { ...current };
        delete next[selectedId];
        return next;
      });
    }
    setImageDataUrl(await fileToDataUrl(file));
    setImageKind('data-url');
    setMessage(`Loaded ${file.name}`);
  };

  const handlePaste = async (event) => {
    const imageItem = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (file) await setFile(file);
  };

  const setGenerationStatus = (queueId, status) => {
    setGenerationStatusById((current) => ({
      ...current,
      [queueId]: {
        ...(current[queueId] || {}),
        ...status,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const setGenerationStatuses = (updates) => {
    if (!updates.length) return;
    const updatedAt = new Date().toISOString();
    setGenerationStatusById((current) => {
      const next = { ...current };
      for (const { queueId, status } of updates) {
        next[queueId] = {
          ...(next[queueId] || {}),
          ...status,
          updatedAt
        };
      }
      return next;
    });
  };

  const setGeneratedImage = (queueId, data) => {
    setGeneratedById((current) => ({
      ...current,
      [queueId]: {
        ...(current[queueId] || {}),
        ...data
      }
    }));
    if (selectedIdRef.current === queueId) {
      setImageDataUrl(data.dataUrl || '');
      setImageKind(data.dataUrl ? 'data-url' : '');
      if (data.revisedPrompt) setRevisedPrompt(data.revisedPrompt);
    }
  };

  const approveGeneratedItem = async (item, dataUrl) => {
    await jsonFetch('/api/fc5-icons/approve', {
      method: 'POST',
      body: JSON.stringify({
        iconKey: item.iconKey,
        queueId: item.queueId,
        image: { kind: 'data-url', value: dataUrl }
      })
    });
    setGenerationStatus(item.queueId, { state: 'approved', message: 'Auto approved' });
  };

  const updateQueueState = () => {
    setGenerationQueue([...generationQueueRef.current]);
    setRunningIds([...runningIdsRef.current]);
  };

  async function runGenerationJob(item) {
    setGenerationStatus(item.queueId, { state: 'running', message: `Generating ${item.name}` });
    setMessage(`Generating ${item.name}`);
    try {
      let pendingApproval = Promise.resolve();
      const response = await fetch('/api/fc5-icons/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          iconKey: item.iconKey,
          queueId: item.queueId,
          reasoningEffort: reasoningEffortRef.current
        })
      });
      await readSseStream(response, ({ event, data }) => {
        if (event === 'status') {
          setGenerationStatus(item.queueId, { state: 'running', message: data.message || 'Generating image' });
        } else if (event === 'partial_image') {
          setGeneratedImage(item.queueId, {
            dataUrl: data.dataUrl || '',
            revisedPrompt: data.revisedPrompt || ''
          });
          setGenerationStatus(item.queueId, { state: 'running', message: 'Preview updated' });
        } else if (event === 'done') {
          const dataUrl = data.dataUrl || '';
          setGeneratedImage(item.queueId, {
            dataUrl,
            revisedPrompt: data.revisedPrompt || '',
            responseId: data.responseId || '',
            imageCallId: data.imageCallId || ''
          });
          if (saveModeRef.current === 'auto' && dataUrl) {
            setGenerationStatus(item.queueId, { state: 'approving', message: 'Approving generated icon' });
            pendingApproval = approveGeneratedItem(item, dataUrl);
          } else {
            setGenerationStatus(item.queueId, { state: 'done', message: 'Generated' });
          }
        } else if (event === 'error') {
          throw new Error(data.error || 'Generation failed.');
        }
      });
      await pendingApproval;
    } catch (error) {
      setGenerationStatus(item.queueId, { state: 'error', message: error.message || String(error) });
      setMessage(error.message || String(error));
    } finally {
      runningIdsRef.current.delete(item.queueId);
      updateQueueState();
      pumpGenerationQueue();
    }
  }

  function pumpGenerationQueue() {
    if (queuePumpActiveRef.current) return;
    queuePumpActiveRef.current = true;
    try {
      const claimedItems = [];
      while (runningIdsRef.current.size < generationConcurrencyRef.current && generationQueueRef.current.length) {
        const queueId = generationQueueRef.current.shift();
        const item = generationItemsByIdRef.current[queueId] || itemsRef.current.find((record) => record.queueId === queueId);
        if (!item) {
          setGenerationStatus(queueId, { state: 'error', message: 'Record is no longer visible.' });
          continue;
        }
        runningIdsRef.current.add(queueId);
        claimedItems.push(item);
      }
      setGenerationStatuses(claimedItems.map((item) => ({
        queueId: item.queueId,
        status: { state: 'running', message: `Generating ${item.name}` }
      })));
      updateQueueState();
      for (const item of claimedItems) {
        runGenerationJob(item);
      }
      if (!generationQueueRef.current.length && !runningIdsRef.current.size) {
        setMessage('Generation queue complete');
      }
    } finally {
      queuePumpActiveRef.current = false;
    }
  }

  const enqueueGeneration = (records, { quiet = false } = {}) => {
    const ids = records
      .filter(Boolean)
      .map((item) => item.queueId)
      .filter((queueId) => !generationQueueRef.current.includes(queueId) && !runningIdsRef.current.has(queueId));
    if (!ids.length) {
      if (!quiet) setMessage('No new records to queue.');
      return;
    }
    const itemUpdates = {};
    for (const item of records) {
      if (ids.includes(item.queueId)) {
        itemUpdates[item.queueId] = item;
      }
    }
    generationItemsByIdRef.current = {
      ...generationItemsByIdRef.current,
      ...itemUpdates
    };
    setGenerationItemsById(generationItemsByIdRef.current);
    generationQueueRef.current = [...generationQueueRef.current, ...ids];
    for (const queueId of ids) {
      const item = records.find((record) => record.queueId === queueId);
      setGenerationStatus(queueId, { state: 'queued', message: `Queued ${item?.name || 'record'}` });
    }
    updateQueueState();
    if (!quiet) setMessage(`Queued ${ids.length} generation${ids.length === 1 ? '' : 's'}`);
    setTimeout(() => pumpGenerationQueue(), 0);
  };

  const queueAllFromFilter = async () => {
    if (queueingFilter) return;
    setQueueingFilter(true);
    try {
      let queued = 0;
      let nextOffset = 0;
      let more = true;
      while (more) {
        const params = new URLSearchParams({ status });
        if (pack) params.set('pack', pack);
        if (query.trim()) params.set('q', query.trim());
        params.set('limit', '500');
        params.set('offset', String(nextOffset));
        const payload = await jsonFetch(`/api/fc5-icons/queue?${params.toString()}`);
        const batch = payload.items || [];
        enqueueGeneration(batch, { quiet: true });
        queued += batch.length;
        setMessage(`Queued filter: ${queued} records`);
        more = Boolean(payload.hasNext);
        nextOffset += Number(payload.limit || 500);
      }
      setMessage(`Queued filter: ${queued} records`);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setQueueingFilter(false);
    }
  };

  const clearPendingGenerationQueue = () => {
    const cleared = generationQueueRef.current.length;
    for (const queueId of generationQueueRef.current) {
      setGenerationStatus(queueId, { state: 'cancelled', message: 'Removed from queue' });
    }
    generationQueueRef.current = [];
    updateQueueState();
    setMessage(cleared ? `Cleared ${cleared} queued generation${cleared === 1 ? '' : 's'}` : 'No queued generations to clear.');
  };

  const approve = async () => {
    if (!selected) return;
    const image = imageKind === 'url'
      ? { kind: 'url', value: urlValue.trim() }
      : { kind: 'data-url', value: imageDataUrl };
    if (!image.value) {
      setMessage('Paste/drop an image or choose a URL first.');
      return;
    }
    setLoading(true);
    try {
      await jsonFetch('/api/fc5-icons/approve', {
        method: 'POST',
        body: JSON.stringify({ iconKey: selected.iconKey, queueId: selected.queueId, image })
      });
      setGeneratedById((current) => {
        const next = { ...current };
        delete next[selected.queueId];
        return next;
      });
      setGenerationStatus(selected.queueId, { state: 'approved', message: 'Approved' });
      setMessage(`Approved ${selected.name}`);
      await loadQueue();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => enqueueGeneration([selected]);

  const skip = async () => {
    if (!selected) return;
    await jsonFetch('/api/fc5-icons/skip', {
      method: 'POST',
      body: JSON.stringify({ iconKey: selected.iconKey, queueId: selected.queueId, reason: 'operator-skip' })
    });
    setMessage(`Skipped ${selected.name}`);
    await loadQueue();
  };

  const reset = async () => {
    if (!selected) return;
    await jsonFetch('/api/fc5-icons/reset', {
      method: 'POST',
      body: JSON.stringify({ iconKey: selected.iconKey })
    });
    setGeneratedById((current) => {
      const next = { ...current };
      delete next[selected.queueId];
      return next;
    });
    setMessage(`Reset ${selected.name}`);
    await loadQueue();
  };

  const copyPrompt = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(buildPromptCopy(selected));
      setMessage(`Copied prompt for ${selected.name}`);
    } catch (error) {
      setMessage(`Copy failed: ${error.message || String(error)}`);
    }
  };

  return (
    <Box minH="100vh" bg="gray.950" color="gray.100" fontFamily="Inter, system-ui, sans-serif">
      <Flex h="100vh" overflow="hidden">
        <Box w="360px" borderRightWidth="1px" borderColor="gray.800" bg="black" display="flex" flexDirection="column">
          <Box p="4" borderBottomWidth="1px" borderColor="gray.800">
            <Heading size="md" letterSpacing="0">FC5 Icon Operator</Heading>
            <Text mt="1" color="gray.500" fontSize="13px">{message}</Text>
            <Grid mt="4" templateColumns="1fr 1fr" gap="2">
              <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </NativeSelect>
              <NativeSelect value={pack} onChange={(event) => setPack(event.target.value)}>
                {PACKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </NativeSelect>
            </Grid>
            <Input
              mt="2"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, source, description"
              bg="gray.950"
              borderColor="gray.700"
              size="sm"
            />
            <HStack mt="2" justify="space-between">
              <Text color="gray.500" fontSize="12px">
                {totalCount ? `${offset + 1}-${offset + items.length} of ${totalCount}` : '0 records'}
              </Text>
              <HStack gap="1">
                <Button size="xs" variant="outline" disabled={!hasPrevious} onClick={() => setOffset(Math.max(0, offset - QUEUE_PAGE_SIZE))}>Prev</Button>
                <Button size="xs" variant="outline" disabled={!hasNext} onClick={() => setOffset(offset + QUEUE_PAGE_SIZE)}>Next</Button>
              </HStack>
            </HStack>
          </Box>
          <Box flex="1" minH="0">
            {loading && !items.length ? (
              <Flex h="100%" align="center" justify="center"><Spinner /></Flex>
            ) : (
              <QueueList
                items={items}
                selectedId={selected?.queueId || ''}
                generationStatusById={generationStatusById}
                onSelect={setSelectedId}
              />
            )}
          </Box>
        </Box>

        <Grid flex="1" templateColumns="minmax(420px, 1fr) 360px" minW="0">
          <Box p="6" overflowY="auto">
            {selected ? (
              <Stack gap="5">
                <HStack justify="space-between" align="start" gap="4" flexWrap="wrap">
                  <Box minW="0" flex="1">
                    <HStack gap="2">
                      <Badge colorPalette="blue">{selected.packKey}</Badge>
                      <Badge colorPalette={selected.status === 'approved' ? 'green' : selected.status === 'skipped' ? 'yellow' : 'red'}>
                        {selected.status}
                      </Badge>
                    </HStack>
                    <Heading mt="3" size="lg" letterSpacing="0">{selected.name}</Heading>
                    <Text color="gray.500" fontSize="13px">{selected.type} · {selected.sourceBook || 'Unknown source'}</Text>
                  </Box>
                  <HStack flexWrap="wrap" justify="flex-end">
                    <Button onClick={generate} colorPalette="blue" disabled={selectedIsQueuedOrRunning}>Generate</Button>
                    <Button onClick={() => enqueueGeneration(items)} variant="outline" disabled={!items.length}>Queue page</Button>
                    <Button onClick={queueAllFromFilter} variant="outline" loading={queueingFilter} disabled={!totalCount}>Queue filter</Button>
                    <NativeSelect value={generationConcurrency} onChange={(event) => setGenerationConcurrency(Number(event.target.value) || 1)}>
                      {PARALLEL_OPTIONS.map((value) => <option key={value} value={value}>Parallel {value}</option>)}
                    </NativeSelect>
                    <NativeSelect value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value)}>
                      {REASONING_EFFORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </NativeSelect>
                    <NativeSelect value={saveMode} onChange={(event) => setSaveMode(event.target.value)}>
                      {SAVE_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </NativeSelect>
                    <Button onClick={clearPendingGenerationQueue} variant="outline" disabled={!queuedCount}>Clear queue</Button>
                    <Button onClick={copyPrompt} variant="outline">Copy prompt</Button>
                    <Button onClick={reset} variant="outline">Reset</Button>
                    <Button onClick={skip} variant="outline">Skip</Button>
                    <Button onClick={approve} colorPalette="green" loading={loading}>Approve</Button>
                  </HStack>
                </HStack>

                <DropZone
                  imageDataUrl={imageDataUrl}
                  urlValue={urlValue}
                  currentImg={selected.override?.img || selected.img}
                  onFile={setFile}
                  onPaste={handlePaste}
                  onUrlChange={(value) => {
                    if (selectedId) {
                      setGeneratedById((current) => {
                        const next = { ...current };
                        delete next[selectedId];
                        return next;
                      });
                    }
                    setUrlValue(value);
                    setImageKind(value.trim() ? 'url' : '');
                  }}
                  onUrlUse={() => {
                    if (urlValue.trim()) {
                      setImageKind('url');
                      setImageDataUrl('');
                      setMessage('URL queued for approval');
                    }
                  }}
                />

                <GenerationResults
                  items={items}
                  generationItemsById={generationItemsById}
                  generatedById={generatedById}
                  generationStatusById={generationStatusById}
                  selectedId={selected.queueId}
                  page={generationResultsPage}
                  onPageChange={setGenerationResultsPage}
                  onSelect={setSelectedId}
                />
              </Stack>
            ) : (
              <Flex h="100%" align="center" justify="center" color="gray.500">No records match this queue.</Flex>
            )}
          </Box>

          <Box borderLeftWidth="1px" borderColor="gray.800" p="5" overflowY="auto" bg="gray.900">
            {selected && (
              <Stack gap="4">
                <Box>
                  <FieldLabel>Generation queue</FieldLabel>
                  <Text fontSize="14px">{runningCount} running · {queuedCount} queued · parallel {generationConcurrency}</Text>
                  {selectedGenerationStatus && (
                    <Text color="gray.500" fontSize="12px">{selectedGenerationStatus.message || selectedGenerationStatus.state}</Text>
                  )}
                </Box>
                <Box>
                  <FieldLabel>Source</FieldLabel>
                  <Text fontSize="14px">{selected.sourceBook || 'Unknown'}</Text>
                  <Text color="gray.500" fontSize="12px">{selected.sourceCategory || 'uncategorized'} {selected.rules ? `· ${selected.rules}` : ''}</Text>
                </Box>
                <Box>
                  <FieldLabel>Current image</FieldLabel>
                  <Text fontSize="12px" color="gray.400" wordBreak="break-all">{selected.override?.img || selected.img || '(none)'}</Text>
                </Box>
                <Box>
                  <FieldLabel>Icon key</FieldLabel>
                  <Text fontSize="12px" color="gray.400" wordBreak="break-all">{selected.iconKey}</Text>
                </Box>
                <Box>
                  <FieldLabel>Description</FieldLabel>
                  <Text mt="1" color="gray.300" fontSize="13px" lineHeight="1.5">
                    {selected.description || 'No description text.'}
                  </Text>
                </Box>
                {revisedPrompt && (
                  <Box>
                    <FieldLabel>Generated prompt</FieldLabel>
                    <Text mt="1" color="gray.300" fontSize="12px" lineHeight="1.5">
                      {revisedPrompt}
                    </Text>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Grid>
      </Flex>
    </Box>
  );
}

createRoot(document.getElementById('root')).render(
  <ChakraProvider value={defaultSystem}>
    <App />
  </ChakraProvider>
);
