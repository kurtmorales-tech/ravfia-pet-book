'use client';

import { useState } from 'react';

// Chat panel: the customer describes what they need in plain English and
// the assistant pre-fills the booking form.
export default function ScheduleAssistant({ onFill }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Tell me what you need in plain words — like “I need someone to watch my dog next Friday evening” — and I’ll fill in the booking form for you.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      if (data.fields && Object.keys(data.fields).length > 0) {
        onFill(data.fields);
      }
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `Sorry — ${err.message} You can also fill in the form directly below.` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="chat-msg assistant">One moment…</div>}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Book a walk for my dog Milo tomorrow afternoon"
          aria-label="Describe the booking you need"
        />
        <button className="primary" type="submit" disabled={busy}>
          Ask
        </button>
      </form>
    </div>
  );
}
