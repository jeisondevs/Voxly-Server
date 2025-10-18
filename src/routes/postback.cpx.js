import { Router } from 'express';
const router = Router();

// Ruta raíz de /cpx -> responde un mensaje claro
router.get('/', (req, res) => {
  return res.json({ message: 'Endpoint CPX activo. Usa /cpx/postback para postbacks.' });
});

// Datos de ejemplo
const postback = [
  { id: 1, name: 'Producto 1', price: 100, categories: ['cpx1', 'cpx2'] },
  { id: 2, name: 'Producto 2', price: 200, categories: ['cpx2', 'cpx3'] },
  { id: 3, name: 'Producto 3', price: 300, categories: ['cpx1', 'cpx3'] }
];

// GET /cpx/postback?cpx=cpx1
router.get('/postback', (req, res) => {
  const { cpx } = req.query;
  if (cpx) {
    const filtered = postback.filter(item => item.categories.includes(cpx));
    return res.json(filtered);
  }
  return res.json(postback);
});

export default router;
