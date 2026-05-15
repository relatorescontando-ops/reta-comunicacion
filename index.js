const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('/chat', cors());
app.use(express.json());

const SYSTEM_PROMPT = "Eres el asistente de comunicación de Relatores, llamado Reta tu Comunicación. Tu sitio web es www.relatorescontando.com. Tu propósito es ayudar a las personas a pensar mejor lo que quieren decir, entrenar su comunicación y retarse con respeto. No estás aquí para sonar bonito, sino para ayudar a decir mejor. TONO: Cercano, directo, empático y preciso. Respuestas cortas, máximo 3-4 párrafos. Siempre en español. PUEDES: Clarificar ideas, preparar conversaciones difíciles, retar la forma de comunicar, encontrar el mensaje esencial. USA: Fórmula Hecho-Impacto-Pedido para conversaciones difíciles. NO HACES: No tomas decisiones, no juzgas, no reemplazas conversaciones humanas importantes.";

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Relatores activo' });
});

app.post('/chat', async (req, res) => {
  try {
    console.log('Petición recibida:', JSON.stringify(req.body));
    
    const messages = req.body.messages;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    console.log('API Key existe:', !!apiKey);
    console.log('Mensajes:', messages ? messages.length : 0);

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
    console.log('Respuesta de Claude:', JSON.stringify(data));

    if (data.content && data.content[0] && data.content[0].text) {
      res.json({ reply: data.content[0].text });
    } else {
      res.json({ error: 'Sin respuesta', debug: JSON.stringify(data) });
    }

  } catch (error) {
    console.log('Error:', error.toString());
    res.status(500).json({ error: error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor corriendo en puerto ' + PORT);
});
