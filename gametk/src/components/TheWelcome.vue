<script setup>
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'
import { ref, watch } from 'vue'
import { createWorker } from 'tesseract.js'
import levenshtein from 'js-levenshtein'


function calculatePot(value, upgrades) {
  if (!value) return 0
  return value + upgrades * 10
}

const itemName = ref('')
const spellPower = ref(0)
const physicalPower = ref(0)
const health = ref(0)
const bonuses = ref([])
const levelReq = ref(0)
const upgrades = ref(0)
const maxUpgrades = ref(0)
const sellPrice = ref(0)
const classType = ref('')
const isProcessing = ref(false)

const potSpellPower = ref(0)
const potPhysicalPower = ref(0)
const potHealth = ref(0)

const file = ref(null)

const parseImage = async file => {
  const worker = await createWorker()
  const {
    data: { text },
  } = await worker.recognize(file, 'eng')
  await worker.terminate()
  parseData(text)
  isProcessing.value = false

}

const onSubmit = e => {
  e.preventDefault()
  isProcessing.value = true
  const formData = new FormData()
  formData.append('file', file.value) // Submit to tesseract
  parseImage(file.value)
}

function pasteFunction(pasteEvent, callback) {
  if (pasteEvent.clipboardData == false) {
    if (typeof callback == 'function') {
      callback(undefined)
    }
  }

  var items = pasteEvent.clipboardData.items

  if (items == undefined) {
    if (typeof callback == 'function') {
      callback(undefined)
    }
  }
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') == -1) continue
    var blob = items[i].getAsFile()
    addImage(blob)
  }
}
const preview = ref(null)
watch(file, value => {
  if (!value) {
    preview.value = null
    return
  }
  const reader = new FileReader()
  reader.onload = e => {
    preview.value = e.target.result
  }
  reader.readAsDataURL(value)
})

function addImage(fileItem) {
  if (!fileItem.type.match('image.*')) {
    return new Promise(reject => {
      const error = {
        message: 'File must be an image.',
        response: {
          status: 200,
        },
      }
      reject()
      return
    })
  }
  file.value = fileItem
}

// OTHER HANDLES
function determineItemClass() {}

function updatePots() {
  potPhysicalPower.value = calculatePot(parseValue(physicalPower.value), maxUpgrades.value - upgrades.value)
  potSpellPower.value = calculatePot(parseValue(spellPower.value), maxUpgrades.value - upgrades.value)
  potHealth.value = calculatePot(parseValue(health.value), maxUpgrades.value - upgrades.value)
}


function doesMatch(line, keyword) {
  // Trim and then check if a word exists that matches at least 75% of the keyword
  return line.trim().split(' ').some(word => {
    
    if (word.length < keyword.length * 0.75 || word.length == 0) {
      return false
    }
    

    return (
      keyword.toLowerCase().includes(word.toLowerCase()) ||
      word.toLowerCase().includes(keyword.toLowerCase()) ||
      levenshtein(word.toLowerCase(), keyword.toLowerCase()) < 3
    )
  })
}

function parseValue(value) {
  if (typeof value == 'number') {
    return value
  }
  // Pick last number in the string
  const matches = value.match(/\d+/g)
  if (!matches) {
    return 0
  }

  // Check if there are any values separated by just a ' '
  // Trim any empty strings
  const filtered = matches.filter(match => match.trim() != '')
  // Join subsequent numbers
  const subsequentVals = []

  for (let i = 0; i < filtered.length; i++) {
    if (parseInt(filtered[i]) == NaN) {
      subsequentVals.clear()
      continue
    }

    subsequentVals.push(filtered[i])
  }
  return parseInt(subsequentVals.join(''))
}


function parseData(data) {
  console.log(data)
  data = data.replace(/[^\x00-\x7F]/g, "");
  // Format should be as follows:
  /*
  Name , Physical, Spell, Health?, (bonuses), Lvl Req, #upgrades, sell price
  */

  const lines = data.split('\n')

  // Keywords to help determine which keywords are used.
  const keywordOrder = {
    Physical: 1,
    Spell: 1,
    Health: 0,
    '+': 0,
    REQ: 1,
    Upgrades: 1,
    Sell: 1,
  }
  const hasHealth = ['Helm', 'Ring', 'Armor']
  const hasAttributes = ['Ring']
  const classes = ["Warrior", "Mage", "Guardian"]

  const name = lines[0]

  // Check name if it has health
  for (let healthKeyword of hasHealth) {
    if (name.includes(healthKeyword)) {
      keywordOrder['Health'] = 1
      break
    }
  }

  // Check name if it has attributes
  for (let attributeKeyword of hasAttributes) {
    if (name.includes(attributeKeyword)) {
      keywordOrder['+'] = 1
      break
    }
  }

  // Remove any keys that have value 0
  for (const [key, value] of Object.entries(keywordOrder)) {
    if (value == 0) {
      delete keywordOrder[key]
    }
  }





  function parseKeyword(keyword, offset = 0) {
    const keywordIndex = lines
      .slice(offset)
      .findIndex(line => doesMatch(line, keyword))

    if (keywordIndex == -1) {
      return
    }

    const nextKeywordIndex = lines.slice(offset + keywordIndex + 1).findIndex(line =>
      Object.keys(keywordOrder).some(next_keyword => {
        // Skip if the next keyword is the same as the current keyword
        // Exception is the attributes
        if (next_keyword == keyword && next_keyword != '+') {
          return false
        }
        return doesMatch(line, next_keyword)
      }),
    )

    // If there is no next keyword, then it is the last line
    const endIndex =
      nextKeywordIndex == -1
        ? lines.length
        : keywordIndex + nextKeywordIndex + 1

    const itemData = lines.slice(keywordIndex, endIndex)
    // Remove any empty lines
    const filteredData = itemData.filter(line => line.trim() != '')

    // If nothing found, return empty
    if (filteredData.length == 0) {
      return
    }

    return {
      keyword,
      start: keywordIndex + offset,
      end: endIndex + offset,
      data: filteredData.join(' '),
    }
  }

  // Clear all old values
  physicalPower.value = 0
  spellPower.value = 0
  health.value = 0
  bonuses.value = []
  levelReq.value = 0
  upgrades.value = 0
  maxUpgrades.value = 0
  sellPrice.value = 0
  classType.value = ''
  potHealth.value = 0
  potPhysicalPower.value = 0
  potSpellPower.value = 0
  itemName.value = name

  const contents = {}
  for (let keyword of Object.keys(keywordOrder)) {
    let offset = 0

    if (keyword == '+') {
      let count = 1
      const contentIndex = contents.length
      let value = parseKeyword(keyword, offset)
      while (value) {
        if (count == 1) contents[keyword] = { keyword, data: [value.data] }
        else contents[keyword].data.push(value.data)
        value = parseKeyword(keyword, offset)
        if (value) offset = value.end
        count++
      }
    } else contents[keyword] = parseKeyword(keyword, offset)

    if (!contents[keyword]) continue

    // Set relevant states
    switch (keyword) {
      case 'Physical':
        physicalPower.value = parseValue(contents['Physical'].data)
        break
      case 'Spell':
        spellPower.value = parseValue(contents['Spell'].data)
        break
      case 'Health':
        health.value = parseValue(contents['Health'].data)
        break
      case '+':
        bonuses.value = contents['+'].data
        break
      case 'REQ':
        levelReq.value = parseValue(contents['REQ'].data)
        break
      case 'Upgrades':
        const [current, max] = contents['Upgrades'].data.split('/')
        upgrades.value = parseValue(current)
        maxUpgrades.value = parseValue(max)
        break
      case 'Sell':
        sellPrice.value = parseValue(contents['Sell'].data)
        break
    }
    classType.value = classes.find(item => doesMatch(name, item))

    // If unable to determine class.
    // Predict based on stats. Higher physical power = Warrior
    if (!classType.value) {
      if (physicalPower.value > spellPower.value) {
        classType.value = 'Warrior'
      } else if (spellPower.value > physicalPower.value) {
        classType.value = 'Mage'
      } else {
        classType.value = 'Guardian'
      }
    }
  }

  // Calculate the potential values
  updatePots();
}

watch([
  physicalPower,
  spellPower,
  health,
  upgrades,
  maxUpgrades
], (value) => {
  updatePots();
})
</script>

<template>
  <div class="flex items-center justify-center min-w-[75vw] gap-8">
    <form
      @submit="onSubmit"
      class="flex flex-col items-center justify-between gap-8"
    >
      <!-- Accept image -->
      <div class="flex gap-2 items-center justify-center flex-col">
        <!-- Image preview -->
        <img
          :src="preview"
          alt=""
          class="h-[40vh] w-[30vw] object-contain bg-[#0f0f0f] rounded-md"
        />
        <div>
        <div class="flex gap-4 items-center justify-center mt-4">
        <!-- Accept image from clipboard -->
        <b-form-textarea
          @paste="pasteFunction"
          class=" bg-black rounded-md p-4 block hover:scale-110 h-full hover:bg-[#4b4b4b]"
        >
          <p class="pointer-events-none"><v-icon name="la-paste-solid"/> Paste into Me.</p>
        </b-form-textarea>
        
        <!-- Submit button -->
        <button v-if="isProcessing" type="button" class="bg-transparent scale-125 p-4 text-white rounded-md" disabled>
          <v-icon name="ri-loader-4-fill" class="animate-spin"/>

        </button>
        <button v-else type="submit" class="bg-blue-500 p-4  h-full text-white rounded-md">
          <v-icon name="bi-upload"/>
        </button>
      </div>
      </div>
  </div>
    </form>

    <div class="">
      <h1 class="text-2xl">{{ itemName }}</h1>
      <p>Class: <span>{{classType}}</span></p>
      <p class="text-lg">
        <span class="text-red-500"><v-icon name="gi-broadsword"/> Physical Power:</span>
        <input v-model="physicalPower" type="text" class="bg-inherit ml-2 w-32"/>

        <span :class="classType === 'Warrior' ? 'text-yellow-400' : 'text-gray-500'"v-if="potPhysicalPower"
          >({{ potPhysicalPower.toLocaleString() }})</span
        >
      </p>
      <p class="text-lg">
        <span class="text-purple-500"><v-icon name="si-codemagic"/> Spell Power:</span>
        <input v-model="spellPower" type="text" :placeholder="spellPower" class="bg-inherit ml-2 w-32"/>
        <span :class="classType === 'Mage' ? 'text-yellow-400' : 'text-gray-500'" v-if="potSpellPower"
          >({{ potSpellPower.toLocaleString() }})</span
        >
      </p>
      <p class="text-lg">
        <span class="text-green-500"><v-icon name="bi-heart-fill"/> Health:</span>
        <input v-model="health" type="text" :placeholder="health" class="bg-inherit ml-2 w-32"/>

        <span :class="classType === 'Guardian' ? 'text-yellow-400' : 'text-gray-500'" v-if="potHealth"
          >({{ potHealth.toLocaleString() }})</span
        >
      </p>
      <br/>
      <p v-if="bonuses && bonuses.length">
        Bonuses:
          <ul>
            <li v-for="(item, index) in bonuses" :key="index">{{ item }}</li>
          </ul>
      </p>
      <p>Level Requirement: {{ levelReq }}</p>
      <p><v-icon name="px-plus"/> Upgrades:         
        <input v-model="upgrades" type="text"class="bg-inherit ml-2 w-32"/>
        /<input v-model="maxUpgrades" type="text" :placeholder="maxUpgrades" class="bg-inherit ml-2 w-32"/>
        </p>
      <p><v-icon name="ri-coin-fill"/> Sell Price: {{ sellPrice }}</p>
      <br/>
      <div class="bg-[#0f0f0f] rounded-md flex overflow-clip">
        <p class="p-4 flex-1">SELLING</p>
        <button class="float-right border-l-2 border-[#424242] w-12 flex items-center justify-center bg-[#252525]"><v-icon name="hi-clipboard-copy" class="text-[#858585]"/></button>
      </div>
    </div>
  </div>
</template>
