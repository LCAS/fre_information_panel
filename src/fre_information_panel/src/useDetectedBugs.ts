import { useEffect, useRef, useState } from 'react';
import { connect } from 'rclnodejs/web';

const BRIDGE_WS = `ws://${window.location.hostname}:9000/capability`;
const TOPIC = '/bug_detection/detected_bugs';
const DEFAULT_IDLE_MS = 5000;

type RuntimeConfig = {
  idleMs?: number;
};

type UseDetectedBugsOptions = {
  idleMs?: number;
  onEnter?: () => void;
  onExit?: () => void;
};

export function useDetectedBugs(options?: UseDetectedBugsOptions): string {
  const [runtimeIdleMs, setRuntimeIdleMs] = useState<number>(DEFAULT_IDLE_MS);
  const idleMs = options?.idleMs ?? runtimeIdleMs;
  const [bugText, setBugText] = useState<string>('');
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReceivingRef = useRef(false);
  const onEnterRef = useRef(options?.onEnter);
  const onExitRef = useRef(options?.onExit);

  onEnterRef.current = options?.onEnter;
  onExitRef.current = options?.onExit;

  useEffect(() => {
    if (options?.idleMs !== undefined) {
      return;
    }

    let isMounted = true;

    async function loadRuntimeConfig() {
      try {
        const response = await fetch('/config.json');
        if (!response.ok) {
          throw new Error(`Unexpected config response: ${response.status}`);
        }

        const config = (await response.json()) as RuntimeConfig;
        const configuredIdleMs = config.idleMs;

        if (!isMounted || configuredIdleMs === undefined || Number.isNaN(configuredIdleMs)) {
          return;
        }

        setRuntimeIdleMs(configuredIdleMs);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to load runtime config:', message);
      }
    }

    void loadRuntimeConfig();

    return () => {
      isMounted = false;
    };
  }, [options?.idleMs]);

  useEffect(() => {
    let ros: Awaited<ReturnType<typeof connect>> | null = null;

    function handleEnter() {
      if (isReceivingRef.current) {
        return;
      }

      isReceivingRef.current = true;
      console.log('onEnter');
      onEnterRef.current?.();
    }

    function handleExit() {
      if (!isReceivingRef.current) {
        return;
      }

      isReceivingRef.current = false;
      setBugText('');
      console.log('onExit');
      onExitRef.current?.();
    }

    function scheduleExit() {
      if (exitTimerRef.current !== null) {
        clearTimeout(exitTimerRef.current);
      }

      exitTimerRef.current = setTimeout(() => {
        handleExit();
      }, idleMs);
    }

    async function setup() {
      try {
        ros = await connect(BRIDGE_WS);
        await ros.subscribe<'std_msgs/msg/String'>(TOPIC, (msg) => {
          handleEnter();
          setBugText(msg.data);
          scheduleExit();
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to subscribe to detected bugs topic:', message);
        handleExit();
      }
    }

    setup();

    return () => {
      if (exitTimerRef.current !== null) {
        clearTimeout(exitTimerRef.current);
      }
      handleExit();
      void ros?.close();
    };
  }, [idleMs]);

  return bugText;
}
