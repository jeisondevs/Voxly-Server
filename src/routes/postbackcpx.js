import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Ruta raíz de /cpx -> mensaje de comprobación
router.get('/', (req, res) => {
  return res.json({ message: 'Endpoint CPX activo. Usa /cpx/postback para postbacks.' });
});

// Handler que CPX llamará (GET). No validamos hash por ahora (modo prueba).
router.get('/postback', (req, res) => {
  const q = req.query || {};

  // Guardar payload en un log local para inspección
  try {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'cpx-postbacks.log');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${JSON.stringify(q)}\n`, 'utf8');
  } catch (err) {
    console.error('Error escribiendo log CPX', err);
  }

  // Mostrar en consola para desarrollo
  console.log('CPX POSTBACK recibida:', q);

  // Responder exactamente lo que CPX espera
  return res.status(200).type('text').send('OK');
});

export default router;
