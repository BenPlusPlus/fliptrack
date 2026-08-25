import { form, get, post, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  oobe: form('/oobe'),
  login: form('/login'),
  logout: post('/logout'),
  inventory: '/inventory',
  account: '/account',
  acquisitions: {
    new: form('/acquisitions/new'),
    addFlip: form('/acquisitions/:acquisitionId/flips/new'),
    continue: form('/acquisitions/:acquisitionId/continue'),
  },
  tags: route('/tags/:tagId', {
    rename: post('/'),
    delete: form('delete'),
  }),
  flips: {
    show: get('/flips/:flipId'),
    update: post('/flips/:flipId'),
    addTag: post('/flips/:flipId/tags'),
    removeTag: post('/flips/:flipId/tags/:tagId/remove'),
    remove: post('/flips/:flipId/remove'),
    resplit: form('/flips/:flipId/resplit'),
  },
})
