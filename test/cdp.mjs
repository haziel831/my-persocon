// Evaluates JS in the real build's page (started with `live.ps1 start cdp`): node test/cdp.mjs "<expression>"
const list = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id !== 1) return;
  const r = d.result?.result;
  console.log(d.result?.exceptionDetails ? `EXC ${JSON.stringify(d.result.exceptionDetails).slice(0, 400)}` : typeof r?.value === 'string' ? r.value : JSON.stringify(r?.value ?? r));
  ws.close();
};
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: process.argv[2], returnByValue: true, awaitPromise: true } }));
