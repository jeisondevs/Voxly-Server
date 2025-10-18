import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const router = Router();

// Inicializar firebase-admin si se provee credencial (opcional)
try {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (svc) {
    const key = JSON.parse(svc);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(key),
      });
      console.log('Firebase Admin inicializado');
    }
  } else {
    console.log('FIREBASE_SERVICE_ACCOUNT no definido: Firestore DESACTIVADO');
  }
} catch (e) {
  console.error('Error inicializando firebase-admin:', e);
}

// Ruta raíz de /cpx -> mensaje de comprobación
router.get('/', (req, res) => {
  return res.json({ message: 'Endpoint CPX activo. Usa /cpx/postback para postbacks.' });
});

// Helper de logging local
function localLog(obj) {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'cpx-postbacks.log');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${JSON.stringify(obj)}\n`, 'utf8');
  } catch (err) {
    console.error('Error escribiendo log CPX', err);
  }
}

// GET /cpx/postback handler (CPX usa GET)
router.get('/postback', async (req, res) => {
  const q = req.query || {};
  // Normalizar campos esperados
  const status = q.status || q.estado || '';
  const trans_id = q.trans_id || q.tx || '';
  const user_id = q.user_id || q.ext_user_id || q.user_id || '';
  const amount_usd_raw = q.amount_usd || q.amount || q.importe_usd || '0';
  // Asegurar punto decimal
  const amount_usd = String(amount_usd_raw).replace(',', '.');
  const type = q.type || q.tipo || '';

  const payload = { status, trans_id, user_id, amount_usd, type, raw: q, receivedAt: new Date().toISOString() };

  // Log local inmediato
  console.log('CPX POSTBACK recibida:', payload);
  localLog(payload);

  // Si no hay trans_id ni user_id, respondemos OK pero lo registramos (evita crash)
  if (!trans_id) {
    return res.status(200).type('text').send('OK');
  }

  // Si Firestore está disponible, persistir con idempotencia
  if (admin.apps.length) {
    try {
      const db = admin.firestore();
      const txRef = db.collection('cpx_transactions').doc(trans_id);

      const txDoc = await txRef.get();
      if (txDoc.exists) {
        // Ya recibido: actualizamos auditoría pero no duplicamos
        await txRef.update({
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          lastPayload: payload.raw,
          attempts: admin.firestore.FieldValue.increment(1),
        });
        console.log('Postback duplicado detectado, solo auditado:', trans_id);
        return res.status(200).type('text').send('OK');
      }

      // Nuevo postback: guardar documento
      const doc = {
        trans_id,
        user_id,
        status,
        amount_usd: parseFloat(amount_usd) || 0,
        type,
        raw: payload.raw,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false, // marca para cuando implementes el crédito
      };

      await txRef.set(doc);

      console.log('Postback guardado en Firestore:', trans_id);
    } catch (err) {
      console.error('Error persistiendo postback en Firestore:', err);
      // No fallamos la respuesta a CPX; lo registramos localmente
      localLog({ tag: 'firestore_error', error: String(err), payload });
    }
  } else {
    // Firestore no configurado: opcionalmente guardar en disco con idempotencia básica
    try {
      const storeDir = path.join(process.cwd(), 'store');
      fs.mkdirSync(storeDir, { recursive: true });
      const file = path.join(storeDir, `${trans_id}.json`);
      if (fs.existsSync(file)) {
        // ya existe -> incrementar contador llave
        const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
        existing.attempts = (existing.attempts || 1) + 1;
        existing.lastSeen = new Date().toISOString();
        fs.writeFileSync(file, JSON.stringify(existing, null, 2), 'utf8');
        console.log('Postback duplicado guardado localmente:', trans_id);
        return res.status(200).type('text').send('OK');
      }
      fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
      console.log('Postback guardado localmente:', trans_id);
    } catch (err) {
      console.error('Error guardando postback localmente:', err);
    }
  }

  // Responder OK a CPX
  return res.status(200).type('text').send('OK');
});

export default router;
