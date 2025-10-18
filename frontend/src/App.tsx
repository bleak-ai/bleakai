import "./App.css";
import Chat from "./components/Chat";
import {ThreadProvider} from "./contexts/ThreadContext";

function App() {
  return (
    <ThreadProvider>
      <div className="h-dvh">
        <Chat />
      </div>
    </ThreadProvider>
  );
}

export default App;
