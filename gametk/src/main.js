import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { OhVueIcon, addIcons } from 'oh-vue-icons'
import {
  LaPasteSolid,
  SiCodemagic,
  GiBroadsword,
  BiHeartFill,
  RiCoinFill,
  PxPlus,
  BiUpload,
  RiLoader4Fill,
  HiClipboardCopy,
} from 'oh-vue-icons/icons'

addIcons(
  LaPasteSolid,
  SiCodemagic,
  GiBroadsword,
  BiHeartFill,
  RiCoinFill,
  PxPlus,
  BiUpload,
  RiLoader4Fill,
  HiClipboardCopy,
)

const app = createApp(App)

app.component('v-icon', OhVueIcon)
app.use(createPinia())
app.use(router)

app.mount('#app')
