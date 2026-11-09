import { mount } from 'svelte'
import App from './components/app.svelte'
import './index.css'

const app = mount(App, {
  target: document.body,
})

export default app
