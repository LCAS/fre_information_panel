import { useEffect, useState } from 'react';
import { connect } from 'rclnodejs/web';

const BRIDGE_WS = `ws://${window.location.hostname}:9000/capability`;
const TOPIC = '/bug_detection/detected_bugs';

export function useDetectedBugs(): string {
  const [bugText, setBugText] = useState<string>('Waiting for bug detection data...');

  useEffect(() => {
    let ros: Awaited<ReturnType<typeof connect>> | null = null;

    async function setup() {
      try {
        ros = await connect(BRIDGE_WS);
        await ros.subscribe<'std_msgs/msg/String'>(TOPIC, (msg) => {
          setBugText(msg.data);
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setBugText(`Connection failed: ${message}`);
      }
    }

    setup();

    return () => {
      void ros?.close();
    };
  }, []);

  return bugText;
}
