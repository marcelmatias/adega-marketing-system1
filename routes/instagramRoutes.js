const { Router } = require('express');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const {
  status, listarPosts, criarPost, removerPost, conteudoDisponivel, testarConexao,
} = require('../controllers/instagramController');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);
router.use(authorize('admin', 'staff'));

router.get('/status', status);
router.get('/posts', listarPosts);
router.post('/posts', criarPost);
router.delete('/posts/:id', removerPost);
router.get('/conteudo', conteudoDisponivel);
router.get('/testar', testarConexao);

module.exports = router;
