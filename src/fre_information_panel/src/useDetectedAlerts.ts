import { useEffect, useRef, useState } from 'react';
import { connect } from 'rclnodejs/web';

function getBridgeWsUrl(endpoint: string): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new URL(endpoint, `${wsProtocol}//${window.location.host}`).toString();
}
const TOPIC = '/information_panel/alert';
const DEFAULT_ALERT_PERSISTENCE_MS = 5000;
const DEFAULT_BRIDGE_ENDPOINT = '/capability';

type RuntimeConfig = {
  alertPersistenceMs?: number;
  bridgeEndpoint?: string;
};

type UseDetectedAlertsOptions = {
  alertPersistenceMs?: number;
  onEnter?: () => void;
  onExit?: () => void;
};

export function useDetectedAlerts(options?: UseDetectedAlertsOptions): string {
  const [runtimeAlertPersistenceMs, setRuntimeAlertPersistenceMs] = useState<number>(
    DEFAULT_ALERT_PERSISTENCE_MS,
  );
  const [bridgeEndpoint, setBridgeEndpoint] = useState<string>(DEFAULT_BRIDGE_ENDPOINT);
  const alertPersistenceMs = options?.alertPersistenceMs ?? runtimeAlertPersistenceMs;
  const [alertText, setAlertText] = useState<string>('');
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReceivingRef = useRef(false);
  const onEnterRef = useRef(options?.onEnter);
  const onExitRef = useRef(options?.onExit);

  onEnterRef.current = options?.onEnter;
  onExitRef.current = options?.onExit;

  useEffect(() => {
    let isMounted = true;

    async function loadRuntimeConfig() {
      try {
        const response = await fetch('/config.json', {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!response.ok) {
          return;
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          return;
        }

        const config = (await response.json()) as RuntimeConfig;
        const configuredAlertPersistenceMs = config.alertPersistenceMs;

        if (!isMounted) {
          return;
        }

        if (
          options?.alertPersistenceMs === undefined &&
          configuredAlertPersistenceMs !== undefined &&
          !Number.isNaN(configuredAlertPersistenceMs)
        ) {
          setRuntimeAlertPersistenceMs(configuredAlertPersistenceMs);
        }

        if (typeof config.bridgeEndpoint === 'string' && config.bridgeEndpoint.startsWith('/')) {
          setBridgeEndpoint(config.bridgeEndpoint);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('Runtime config unavailable, using defaults:', message);
      }
    }

    void loadRuntimeConfig();

    return () => {
      isMounted = false;
    };
  }, [options?.alertPersistenceMs]);

  useEffect(() => {
    let ros: Awaited<ReturnType<typeof connect>> | null = null;

    function handleEnter() {
      if (isReceivingRef.current) {
        return;
      }

      isReceivingRef.current = true;
      onEnterRef.current?.();
    }

    function handleExit() {
      if (!isReceivingRef.current) {
        return;
      }

      isReceivingRef.current = false;
      setAlertText('');
      onExitRef.current?.();
    }

    function scheduleExit() {
      if (exitTimerRef.current !== null) {
        clearTimeout(exitTimerRef.current);
      }

      exitTimerRef.current = setTimeout(() => {
        handleExit();
      }, alertPersistenceMs);
    }

    async function setup() {
      try {
        ros = await connect(getBridgeWsUrl(bridgeEndpoint));
        await ros.subscribe<'std_msgs/msg/String'>(TOPIC, (msg) => {
          handleEnter();
          setAlertText(msg.data);
          scheduleExit();
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to subscribe to alert topic:', message);
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
  }, [alertPersistenceMs, bridgeEndpoint]);

  return alertText;
}
