// Mind AI companion: runs Qwen2.5-1.5B-Instruct (4-bit) on this device through WebLLM + WebGPU.
// Module worker so the 1 GB model and the inference loop never block the page.
// The library is vendored (vendor/web-llm, Apache-2.0) so script-src 'self' holds.
// Only the model weights and model library are downloaded (Hugging Face, GitHub raw); chat text never leaves the device.
import { CreateMLCEngine } from '../vendor/web-llm/web-llm.js';

const MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
let engine = null, loading = null;

const post = m => self.postMessage(m);
const clean = (s, n) => (typeof s === 'string' ? s : '').slice(0, n);

function load() {
  if (engine) { post({ type: 'ready' }); return; }
  if (loading) return;
  loading = CreateMLCEngine(MODEL, {
    initProgressCallback: r => post({ type: 'progress', progress: Number(r && r.progress) || 0, text: clean(r && r.text, 300) })
  }).then(e => { engine = e; post({ type: 'ready' }); })
    .catch(err => { loading = null; post({ type: 'error', message: clean(String(err && err.message || err), 400) }); });
}

async function chat(id, messages) {
  if (!engine) { post({ type: 'error', id, message: 'Model not loaded' }); return; }
  const msgs = (Array.isArray(messages) ? messages : []).slice(-13)
    .filter(m => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  try {
    const stream = await engine.chat.completions.create({ messages: msgs, stream: true, temperature: 0.6, top_p: 0.9, max_tokens: 220 });
    let text = '';
    for await (const c of stream) {
      const d = c && c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content;
      if (d) { text += d; post({ type: 'delta', id, text }); }
    }
    post({ type: 'done', id, text });
  } catch (err) {
    post({ type: 'error', id, message: clean(String(err && err.message || err), 400) });
  }
}

self.onmessage = e => {
  const d = e.data || {};
  if (d.type === 'load') load();
  else if (d.type === 'chat') chat(Number(d.id) || 0, d.messages);
  else if (d.type === 'stop' && engine) { try { engine.interruptGenerate(); } catch (_) {} }
};
