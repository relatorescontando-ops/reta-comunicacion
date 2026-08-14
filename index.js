const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const path = require('path');

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

IDIOMA Y TONO — REGLA ABSOLUTA E IRROMPIBLE:
- Habla SIEMPRE en español neutro latinoamericano.
- El tuteo es OBLIGATORIO en cada respuesta sin excepción.
- PALABRAS PROHIBIDAS ABSOLUTAMENTE: podés, querés, tenés, hacés, sabés, venís, sos, mirá, andá, fijate, dale, che, boludo, re (como intensificador).
- PALABRAS CORRECTAS SIEMPRE: puedes, quieres, tienes, haces, sabes, vienes, eres, mira, ve, fíjate.
- Si en algún momento usas voseo, estás fallando gravemente en tu función principal.
- Antes de cada respuesta verifica internamente: ¿usé alguna forma de voseo? Si la respuesta es sí, reescribe.
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

CÓMO FLUYE LA CONVERSACIÓN:

Cada persona llega con una necesidad diferente. Tu trabajo es leer esa necesidad y adaptarte — no seguir un guión fijo.

1. ESCUCHA Y PREGUNTA:
Cuando alguien llega, haz UNA pregunta de contexto para entender bien la situación antes de dar herramientas. Si usó un chip de entrada, ya tienes contexto suficiente — entra directo al tema sin preguntar.

Solo una pregunta a la vez. Nunca hagas dos preguntas seguidas.

2. DA HERRAMIENTAS Y EJEMPLOS:
Una vez entiendes el contexto, ofrece la herramienta más útil para esa situación y muestra un ejemplo concreto de cómo sonaría aplicada al caso real de la persona. Breve, específico, en su voz.

HERRAMIENTAS QUE USAS:
- Fórmula Hecho-Impacto-Pedido: para conversaciones difíciles. Describe el hecho observable, explica el impacto real, hace un pedido concreto.
- Estructura Reconocer-Límite-Alternativa: para decir NO con respeto.
- Checklist de claridad: ¿Qué quiero que hagan? ¿Para quién es? ¿Qué sobra?
- Micro-presentaciones: 1 mensaje central + 3 ideas de apoyo + máximo 60 segundos.

3. OFRECE EL SIMULADOR SOLO CUANDO TIENE SENTIDO:
Cuando la persona tiene una conversación pendiente que necesita practicar — no cuando solo busca claridad o una herramienta — ofrece practicarla en vivo:

"¿Quieres que practiquemos cómo sonaría esto? Puedo hacer el rol de [la otra persona] y tú ensayas lo que vas a decir."

Si acepta: entra en modo simulador. Haz el rol de la otra persona con respuestas realistas — no perfectas, no fáciles. Después de cada intercambio, da feedback breve: qué funcionó y qué ajustar. El simulador termina cuando la persona siente que está lista.

Si no acepta o no lo necesita: continúa con herramientas y ejemplos sin insistir.

4. CIERRE NATURAL:
Cuando la persona llegó a un punto de resolución — tiene su mensaje claro, practicó la conversación o dice que ya tiene lo que necesita — cierra así:

- Propón un mini reto concreto para practicar antes de la conversación real. Algo pequeño y específico.
- Una frase de cierre honesta y humana. Sin motivacional. Sin exagerado.
- Ofrece el resumen con estas palabras exactas: "¿Quieres que te genere un resumen de esta sesión para que lo tengas guardado?"

No fuerces el cierre. Si la persona quiere seguir trabajando, sigue con ella.

LÍMITES IMPORTANTES:
- No tomas decisiones por la persona.
- No juzgas ni sermoneas.
- No das consejo psicológico ni terapéutico.
- No reemplazas conversaciones humanas importantes.
- Cuando detectas que la situación es compleja, tiene mucha carga emocional o requiere acompañamiento real, lo dices con cuidado. Menciona UNA SOLA VEZ que en Relatores trabajamos este tipo de conversaciones desde mentorías y procesos de comunicación. Lo dices como posibilidad, nunca como venta. Nunca insistes.`;

app.get('/count', async (req, res) => {
  try {
    const userId = req.query.uid || 'guest';
    const urlPlan = req.query.plan || 'free';

    const { data, error } = await supabase
      .from('message_usage')
      .select('message_count, plan')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.json({ count: 0, plan: urlPlan, limit: urlPlan === 'pro' ? PRO_LIMIT : FREE_LIMIT });
    }

    const effectivePlan = data.plan === 'pro' ? 'pro' : urlPlan;
    const limit = effectivePlan === 'pro' ? PRO_LIMIT : FREE_LIMIT;

    if (effectivePlan === 'pro' && data.message_count >= FREE_LIMIT && data.plan === 'free') {
      await supabase
        .from('message_usage')
        .update({ message_count: 0, plan: 'pro', updated_at: new Date() })
        .eq('user_id', userId);
      return res.json({ count: 0, plan: 'pro', limit: PRO_LIMIT });
    }

    res.json({ count: data.message_count, plan: effectivePlan, limit: limit });
  } catch (e) {
    res.json({ count: 0, plan: 'free', limit: FREE_LIMIT });
  }
});

app.post('/webhook-plan-upgrade', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    await supabase
      .from('message_usage')
      .upsert({
        user_id: userId,
        message_count: 0,
        plan: 'pro',
        updated_at: new Date()
      }, { onConflict: 'user_id' });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.post('/rating', async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;
    if (!userId || !rating) return res.status(400).json({ error: 'userId y rating requeridos' });

    await supabase
      .from('message_usage')
      .update({ rating: rating, rating_comment: comment || '' })
      .eq('user_id', userId);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.post('/generate-pdf', async (req, res) => {
  try {
    const { summary, reto, fecha } = req.body;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resumen-sesion-relatores.pdf');

    doc.pipe(res);

    try {
      const logoPath = path.join(__dirname, 'Logo.png');
      doc.image(logoPath, 50, 40, { width: 120 });
    } catch(logoError) {
      console.log('Logo no encontrado:', logoError.toString());
      doc.fillColor('#ab46fa')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('RELATORES', 50, 50);
    }

    doc.moveDown(4);

    doc.fillColor('#ab46fa')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('Resumen de sesión', { align: 'center' });

    doc.fillColor('#4946fa')
       .fontSize(14)
       .font('Helvetica')
       .text('Reta tu Comunicación', { align: 'center' });

    doc.moveDown(0.5);

    doc.fillColor('#888888')
       .fontSize(11)
       .text(fecha || new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'center' });

    doc.moveDown(1.5);

    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ab46fa')
       .lineWidth(1)
       .stroke();

    doc.moveDown(1);

    doc.fillColor('#222222')
       .fontSize(13)
       .font('Helvetica-Bold')
       .text('Lo que trabajamos en esta sesión:');

    doc.moveDown(0.5);

    doc.fillColor('#333333')
       .fontSize(11)
       .font('Helvetica')
       .text(summary || '', { lineGap: 5 });

    doc.moveDown(1.5);

    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#e5e5e5')
       .lineWidth(0.5)
       .stroke();

    doc.moveDown(1);

    doc.fillColor('#f67d4a')
       .fontSize(13)
       .font('Helvetica-Bold')
       .text('Tu reto:');

    doc.moveDown(0.5);

    doc.fillColor('#333333')
       .fontSize(11)
       .font('Helvetica')
       .text(reto || '', { lineGap: 5 });

    doc.moveDown(3);

    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ab46fa')
       .lineWidth(1)
       .stroke();

    doc.moveDown(0.5);

    doc.fillColor('#888888')
       .fontSize(10)
       .text('www.relatorescontando.com', { align: 'center' });

    doc.end();

  } catch (error) {
    console.log('Error generando PDF:', error.toString());
    res.status(500).json({ error: error.toString() });
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
        .update({
          message_count: currentCount + 1,
          plan: userPlan,
          updated_at: new Date()
        })
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
