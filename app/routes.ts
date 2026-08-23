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
  },
})
