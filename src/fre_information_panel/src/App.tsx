import { useDetectedBugs } from './useDetectedBugs';

export default function App() {
  const bugText = useDetectedBugs({
    onEnter: () => {
      console.log('detected_bugs onEnter');
    },
    onExit: () => {
      console.log('detected_bugs onExit');
    },
  });

  return (
        <p className="color-red-500">
          {bugText}
        </p>
  );
}
