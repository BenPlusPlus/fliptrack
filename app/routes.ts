import { form, get, post, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  oobe: form('/oobe'),
  login: route({
    index: get('/login'),
    action: post('/login'),
    signup: post('/signup'),
  }),
  logout: post('/logout'),
  password: form('/password'),
  inventory: '/inventory',
  account: '/account',
  accountPassword: post('/account/password'),
  admin: route('/admin', {
    index: '/',
    signup: post('/signup'),
    tempPassword: post('/operators/:operatorId/password'),
    inspect: post('/operators/:operatorId/inspect'),
    leave: post('/leave'),
  }),
  acquisitions: {
    new: form('/acquisitions/new'),
    addFlip: form('/acquisitions/:acquisitionId/flips/new'),
    continue: form('/acquisitions/:acquisitionId/continue'),
  },
  tags: route('/tags/:tagId', {
    rename: post('/'),
    delete: form('delete'),
  }),
  channels: route('/channels/:channelId', {
    rename: post('/'),
    delete: form('delete'),
  }),
  listings: {
    index: '/listings',
    new: form('/listings/new'),
    show: get('/listings/:listingId'),
    update: post('/listings/:listingId'),
    end: post('/listings/:listingId/end'),
  },
  sales: {
    new: form('/sales/new'),
    show: get('/sales/:saleId'),
    update: post('/sales/:saleId'),
  },
  writeOffs: {
    new: form('/write-offs/new'),
    show: get('/write-offs/:writeOffId'),
    update: post('/write-offs/:writeOffId'),
  },
  flips: {
    show: get('/flips/:flipId'),
    update: post('/flips/:flipId'),
    addTag: post('/flips/:flipId/tags'),
    removeTag: post('/flips/:flipId/tags/:tagId/remove'),
    remove: post('/flips/:flipId/remove'),
    resplit: form('/flips/:flipId/resplit'),
    undo: form('/flips/:flipId/undo'),
  },
})
