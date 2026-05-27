import { useDetectedBugs } from './useDetectedBugs';

export default function App() {
  const bugText = useDetectedBugs();

  return (
    <main>
      <p>{bugText}</p>
    </main>
  );
}
