const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const SYSTEM_PROMPT = "Eres el asistente de comunicación de Relatores, llamado Reta tu Comunicación. Tu sitio web es www.relatorescontando.com. Tu propósito es ayudar a las personas a pensar mejor lo que quieren decir, entrenar su comunicación y retarse con respeto. No estás aquí para sonar bonito, sino para ayudar a decir mejor. TONO: Cercano, directo, empático y preciso. Respuestas cortas, máximo 3-4 párrafos. Siempre en español. PUEDES: Clarificar ideas, preparar conversaciones difíciles, retar la forma de comunicar, encontrar el mensaje esencial. USA: Fórmula Hecho-Impacto-Pedido para conversaciones difíciles. CUANDO DETECTAS LÍMITE: Menciona UNA SOLA VEZ que en Relatores trabajamos este tipo de conversaciones desde mentorías. Nunca como venta, siempre como posibilidad. NO HACES: No tomas decisiones, no juzgas, no reemplazas conversaciones humanas importantes.";

app.post('/chat', async (req, res) => {
  try {
    const messages = req.body.messages;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      res.json({ reply: data.content[0].text });
    } else {
      res.json({ error: 'Sin respuesta', debug: JSON.stringify(data) });
    }
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reta tu Comunicación | Relatores</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
#header { background: #ab46fa; color: white; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
#logo { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-family: 'Noto Serif', serif; font-size: 14px; font-weight: 600; color: white; flex-shrink: 0; }
#header-info p { font-family: 'Noto Serif', serif; font-size: 16px; font-weight: 600; }
#header-info span { font-size: 12px; opacity: 0.85; }
#header-link { margin-left: auto; font-size: 12px; color: white; opacity: 0.85; text-decoration: none; }
#header-link:hover { opacity: 1; }
#messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; max-width: 800px; width: 100%; margin: 0 auto; }
.bubble { max-width: 78%; padding: 12px 16px; font-size: 15px; line-height: 1.6; word-wrap: break-word; }
.bot { align-self: flex-start; background: white; color: #222; border: 1px solid #e5e5e5; border-radius: 4px 18px 18px 18px; }
.user { align-self: flex-end; background: #4946fa; color: white; border-radius: 18px 18px 4px 18px; }
.typing { align-self: flex-start; background: white; color: #999; border: 1px solid #e5e5e5; border-radius: 4px 18px 18px 18px; font-style: italic; padding: 12px 16px; font-size: 15px; }
#chips-wrap { max-width: 800px; width: 100%; margin: 0 auto; padding: 0 20px 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.chip { font-size: 13px; padding: 6px 14px; border-radius: 20px; border: 1px solid #ab46fa; color: #ab46fa; background: white; cursor: pointer; transition: background 0.15s; }
.chip:hover { background: #f5eeff; }
#bottom-wrap { background: white; border-top: 1px solid #e5e5e5; padding: 14px 20px; }
#bottom { max-width: 800px; margin: 0 auto; display: flex; gap: 10px; }
#input { flex: 1; border: 1.5px solid #ddd; border-radius: 24px; padding: 12px 18px; font-size: 15px; outline: none; font-family: 'Inter', sans-serif; }
#input:focus { border-color: #ab46fa; }
#btn { background: #f67d4a; color: white; border: none; border-radius: 24px; padding: 12px 24px; font-size: 15px; cursor: pointer; font-weight: 600; font-family: 'Inter', sans-serif; transition: background 0.15s; }
#btn:hover { background: #e56a38; }
#btn:disabled { opacity: 0.5; cursor: not-allowed; }
#limit-banner { display: none; background: #fff3f0; border-top: 1px solid #f67d4a; color: #c44a1a; padding: 12px 20px; font-size: 14px; text-align: center; }
#limit-banner a { color: #4946fa; font-weight: 600; }
</style>
</head>
<body>
<div id="header">
  <div id="logo">RC</div>
  <div id="header-info">
    <p>Reta tu Comunicación</p>
    <span>por Relatores</span>
  </div>
  <a href="https://www.relatorescontando.com" target="_blank" id="header-link">relatorescontando.com →</a>
</div>
<div id="messages"></div>
<div id="chips-wrap">
  <div class="chip" onclick="sendChip(this)">Tengo una conversación difícil</div>
  <div class="chip" onclick="sendChip(this)">Quiero mejorar cómo me expreso</div>
  <div class="chip" onclick="sendChip(this)">Necesito dar un feedback</div>
  <div class="chip" onclick="sendChip(this)">No sé cómo decir esto</div>
</div>
<div id="limit-banner">
  Alcanzaste tus 7 mensajes gratuitos. <a href="https://www.relatorescontando.com" target="_blank">Activa tu plan completo →</a>
</div>
<div id="bottom-wrap">
  <div id="bottom">
    <input id="input" type="text" placeholder="Escribe lo que quieres trabajar..." />
    <button id="btn">Enviar</button>
  </div>
</div>
<script>
var history = [];
var messageCount = 0;
var FREE_LIMIT = 7;

function addBubble(text, role) {
  var div = document.createElement('div');
  if (role === 'typing') {
    div.className = 'typing';
    div.textContent = 'Escribiendo...';
  } else {
    div.className = 'bubble ' + (role === 'user' ? 'user' : 'bot');
    div.innerHTML = text.replace(/\n/g, '<br>');
  }
  document.getElementById('messages').appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  return div;
}

function showWelcome() {
addBubble('Hola. Este es un espacio para pensar mejor lo que quieres decir, entrenar tu comunicación y retarte con respeto. ¿Qué conversación, idea o mensaje quieres trabajar hoy?', 'bot');
}

function updateLimit() {
  if (messageCount >= FREE_LIMIT) {
    document.getElementById('limit-banner').style.display = 'block';
    document.getElementById('bottom-wrap').style.display = 'none';
    document.getElementById('chips-wrap').style.display = 'none';
  }
}

function sendChip(el) {
  document.getElementById('chips-wrap').style.display = 'none';
  doSend(el.textContent);
}

function send() {
  var input = document.getElementById('input');
  var text = input.value.trim();
  if (!text) return;
  input.value = '';
  doSend(text);
}

async function doSend(text) {
  if (messageCount >= FREE_LIMIT) return;
  var btn = document.getElementById('btn');
  btn.disabled = true;
  messageCount++;

  addBubble(text, 'user');
  history.push({ role: 'user', content: text });

  var typingBubble = addBubble('', 'typing');

  try {
    var response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });
    var data = await response.json();
    typingBubble.remove();
    if (data.reply) {
      history.push({ role: 'assistant', content: data.reply });
      addBubble(data.reply, 'bot');
    } else {
      addBubble('Error: ' + (data.error || 'desconocido'), 'bot');
    }
  } catch(e) {
    typingBubble.remove();
    addBubble('Error de conexión.', 'bot');
  }

  btn.disabled = false;
  updateLimit();
}

document.getElementById('btn').onclick = send;
document.getElementById('input').onkeypress = function(e) { if (e.key === 'Enter') send(); };
showWelcome();
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor corriendo en puerto ' + PORT);
});
