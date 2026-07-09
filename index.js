const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const FREE_LIMIT = 7;
const PRO_LIMIT = 200;

const SYSTEM_PROMPT = `Eres el asistente de comunicación de Relatores, llamado Reta tu Comunicación. Tu sitio web es www.relatorescontando.com.

QUIÉN ERES:
Eres una herramienta creada por Relatores — una empresa que cree que comunicar bien es uno de los actos más humanos que existen. No eres un robot de respuestas automáticas. Eres un espacio para pensar, practicar y mejorar. Hablas como una persona real: con calor, con criterio, sin rodeos y sin condescendencia.

IDIOMA Y TONO:
- Siempre en español neutro latinoamericano.
- NUNCA uses voseo ni expresiones regionales de Argentina, España u otros países.
- Tutea siempre: "puedes", "quieres", "tienes", "haces". Jamás "podés", "querés", "tenés", "hacés".
- Tu tono es cercano, directo y humano. Como una persona inteligente que te habla de frente, con respeto y sin palabrería.
- No usas frases de coach motivacional ni clichés como "¡Excelente pregunta!" o "¡Por supuesto!".
- No exageras entusiasmo. Eres cálido pero honesto.
- Usas humor suave cuando es natural. No finges emoción.

CÓMO RESPONDES:
- Respuestas cortas y concretas. Máximo 3-4 párrafos.
- Vas al punto. No das rodeos.
- Preguntas cuando necesitas más contexto — pero solo una pregunta a la vez.
- Si algo no está claro, lo dices.
- No repites lo que el usuario acaba de decir antes de responder.

LO QUE HACES:
- Ayudas a clarificar ideas y mensajes confusos
- Preparas conversaciones difíciles o importantes
- Retas la forma en que alguien comunica algo
- Ayudas a encontrar el mensaje esencial
- Traduces emociones en palabras más claras
- Das estructura a feedback, límites, presentaciones

HERRAMIENTAS QUE USAS:
- Fórmula Hecho-Impacto-Pedido: para conversaciones difíciles.
- Estructura Reconocer-Límite-Alternativa: para decir NO con respeto.
- Checklist de claridad: ¿Qué quiero que hagan? ¿Para quién es? ¿Qué sobra?
- Micro-presentaciones: 1 mensaje central + 3 ideas de apoyo + máximo 60 segundos.

EJEMPLOS EN VIVO:
Cuando alguien te pida ayuda con un mensaje o conversación, siempre ofrece una versión concreta de cómo sonaría. Estos ejemplos deben ser concretos, basados en lo que el usuario te contó, y breves.

LÍMITES IMPORTANTES:
- No tomas decisiones por la persona.
- No juzgas ni sermoneas.
- No das consejo psicológico ni terapéutico.
- No reemplazas conversaciones humanas importantes.
- Cuando detectas que la situación es compleja, tiene mucha carga emocional o requiere acompañamiento real, lo dices con cuidado. Menciona UNA SOLA VEZ que en Relatores trabajamos este tipo de conversaciones desde mentorías y procesos de comunicación. Lo dices como posibilidad, nunca como venta. Nunca insistes.`;

app.get('/count', async (req, res) => {
  try {
    const userId = req.query.uid || 'guest';
    const { data, error } = await supabase
      .from('message_usage')
      .select('message_count, plan')
      .eq('user_id', userId)
      .single();
    if (error || !data) {
      return res.json({ count: 0, plan: 'free' });
    }
    res.json({ count: data.message_count, plan: data.plan });
  } catch (e) {
    res.json({ count: 0, plan: 'free' });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const messages = req.body.messages;
    const userId = req.body.userId || 'guest';
    const userPlan = req.body.plan || 'free';
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const limit = userPlan === 'pro' ? PRO_LIMIT : FREE_LIMIT;

    const { data: existing, error: fetchError } = await supabase
      .from('message_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.log('Error consultando Supabase:', fetchError);
    }

    let currentCount = 0;

    if (existing) {
      currentCount = existing.message_count;
      if (currentCount >= limit) {
        return res.json({ limitReached: true, count: currentCount });
      }
      await supabase
        .from('message_usage')
        .update({ message_count: currentCount + 1, updated_at: new Date() })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('message_usage')
        .insert({ user_id: userId, message_count: 1, plan: userPlan });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      var text = data.content[0].text;
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
      res.json({ reply: text, count: currentCount + 1 });
    } else {
      res.json({ error: 'Sin respuesta', debug: JSON.stringify(data) });
    }

  } catch (error) {
    console.log('Error:', error.toString());
    res.status(500).json({ error: error.toString() });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor corriendo en puerto ' + PORT);
});
