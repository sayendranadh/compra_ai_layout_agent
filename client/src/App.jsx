import { useState } from 'react';
import { useLayoutAgent } from './hooks/useLayoutAgent.js';
import ChatWindow from './components/ChatWindow.jsx';
import ChatInput from './components/ChatInput.jsx';
import WireframePreview from './components/WireframePreview.jsx';
import JsonViewer from './components/JsonViewer.jsx';

export default function App() {
  const { layout, messages, loading, sendMessage, resetLayout } = useLayoutAgent();
  const [rightTab, setRightTab] = useState('preview'); // 'preview' | 'json'

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white tracking-tight">Layout Agent</h1>
          <span className="text-xs text-slate-500 hidden sm:block">Chat-powered design tool</span>
        </div>
        <button
          onClick={resetLayout}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          Reset Layout
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Chat */}
        <div className="w-[380px] min-w-[320px] flex flex-col border-r border-slate-800/80 bg-slate-900/40">
          <ChatWindow messages={messages} loading={loading} />
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>

        {/* Right Panel: Preview + JSON */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab selector */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800/80 bg-slate-900/20">
            <button
              onClick={() => setRightTab('preview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                rightTab === 'preview'
                  ? 'bg-slate-700/60 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Wireframe
            </button>
            <button
              onClick={() => setRightTab('json')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                rightTab === 'json'
                  ? 'bg-slate-700/60 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              JSON
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === 'preview' ? (
              <WireframePreview layout={layout} />
            ) : (
              <JsonViewer layout={layout} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
