<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import page from './../layouts/page.vue'
import { v4 as uuidv4 } from 'uuid';

const store = useStore();

/**
 * Break allowed posting time to 5 minutes
 */
let today = ref();
let todayInSeconds = ref();
let dateMin = ref();
let timeMin = ref();
let filteredTimes = ref([]);
let newThread = ref({});
let showNewThreadForm = ref(false);
let twitterInfo = computed(() => store.getters.getTwitterInfo);

const secondsToDayHours = (seconds) => {
seconds = Number(seconds);
let h = Math.floor(seconds % (3600*24) / 3600);
let m = Math.floor(seconds % 3600 / 60);

let hDisplay = h > 9 ? `${h}` : `0${h}`;
let mDisplay = m > 9 ? `:${m}` : `:0${m}`;
return hDisplay + mDisplay + ':00';
}

const timeFunctions = () => {
  today.value = new Date();
  todayInSeconds.value = Date.parse(new Date());
  dateMin.value = `${today.value.getFullYear()}-${(today.value.getMonth() + 1) < 10 ? '0' + (today.value.getMonth() + 1) : (today.value.getMonth() + 1)}-${today.value.getDate() < 10 ? '0' + today.value.getDate() : today.value.getDate()}`; // min date allowed to post (today+)
  let halfHourLater = new Date(today.value.setMinutes(today.value.getMinutes() + 5)) // 5 mins later
  let passedSeconds = (halfHourLater.getHours() * 3600) + (halfHourLater.getMinutes() * 60);
  let count = 0;
  let startingVal = Math.ceil(passedSeconds / 300);
  for(let val = startingVal; val < 288; val++){
    if(count === 0){
      timeMin.value = secondsToDayHours(val * 300);
    }
    filteredTimes.value.push(secondsToDayHours(val * 300));
    count++;
  }
}
timeFunctions();

/**
 * Populate thread
 */
let threads = ref([]);
const breakDate = (utcSeconds) => {
  let givenDate = new Date(utcSeconds);
  let postingDate = `${givenDate.getFullYear()}-${(givenDate.getMonth() + 1) > 9 ? (givenDate.getMonth() + 1) : '0'+(givenDate.getMonth() + 1)}-${givenDate.getDate() > 9 ? givenDate.getDate() : '0'+givenDate.getDate()}`;
  let postingTime = `${givenDate.getHours() > 9 ? givenDate.getHours() : '0'+givenDate.getHours()}:${givenDate.getMinutes() > 9 ? givenDate.getMinutes() : '0'+givenDate.getMinutes()}:00`;
  return {postingDate, postingTime};
}

/**
 * Convers threads data to one we can use on this page
 */
const presentationalData = (dbData) => {
  let temp = JSON.parse(JSON.stringify(dbData));
  return temp.map(item => {
    let {postingDate, postingTime} = breakDate(item.postTime);
    let tweets = item.tweets.length ? item.tweets.map(t => ({text: t, id: uuidv4()})) : item.tweets
    let rawPostTime = item.postTime
    delete item.postTime;
    return Object.assign(item, {postingDate, postingTime, tweets, rawPostTime});
  })
}

let watchThreads = computed(() => store.getters.threads)
watch(watchThreads, (val) => {
  threads.value = presentationalData(val);
})

/**
 * Trigger fetching nof threads
 */
const fetchThreads = async () => {
  await store.dispatch('GET_THREADS')
}

onMounted(() => {
  fetchThreads()
})

/**
 * Populate thread's tweets view toggler
 */
let showThreads = ref({});
computed(() => {
  threads.forEach(thread => {
    showThreads.value[thread['$id']] = false
  })
})

/**
 * Toggle thread's tweets view
 */
const toggleThreadView = (id) => {
  showThreads.value[id] = !showThreads.value[id]
}

/**
 * Add new thread in UI
 */
const addThread = () => {
  if(showNewThreadForm.value){
    showNewThreadForm.value = false
  } else {
    newThread.value = {
      title: "Thread Title",
      tweets: [],
      postingTime: timeMin.value,
      postingDate: dateMin.value,
    }
    showNewThreadForm.value = true;
  }
}

/** Submit new thread to db */
const submitNewThread = async () => {
  let toSubmit = {
    title: newThread.value.title,
    postTime: Date.parse(newThread.value.postingDate + ' ' + newThread.value.postingTime),
    tweets: newThread.value.tweets
  }
  const submittedNewThread = await store.dispatch('ADD_THREAD', toSubmit);
  if(submittedNewThread){
    newThread.value = {
      title: "Thread Title",
      tweets: [],
      postingTime: timeMin.value,
      postingDate: dateMin.value,
    }
    showNewThreadForm.value = false;
  }
}

/** Update thread in db */
const updateThread = (thread) => {
  store.dispatch('UPDATE_THREAD', thread)
}

/** delete thread from db */
const deleteThread = async (threadId) => {
    if(confirm("Delete this thread?")) {
      await store.dispatch('DELETE_THREAD', threadId);
    } else {
      console.log("That was cloose!")
    }
}

/**
 * Add tweet to thread UI
 */
const addTweet = (id) => {
  let index = threads.value.findIndex(thread => thread['$id'] === id);
  threads.value[index].tweets.push({
      text: "A new tweet!",
      id: uuidv4()
    })
}

/**
 * Delete tweets UI
 */
const deleteTweet = (threadId, tweetId) => {
  let threadIndex = threads.value.findIndex(thread => thread['$id'] === threadId);
  let tweetIndex = threads.value[threadIndex].tweets.findIndex(tweet => tweet.id === tweetId);
  threads.value[threadIndex].tweets.splice(tweetIndex, 1)
}

/**
 * Limit tweets to 280 characters
 */
let textLimitJail = ref({})
const textLimitPolice = (tweet) => {
  if(!textLimitJail.value[tweet.id]) textLimitJail.value[tweet.id] = "";
  if(tweet.text.length <= 280){
    textLimitJail.value[tweet.id] = tweet.text;
  } else {
    console.log("OVER 280 chars ")
    tweet.text = textLimitJail.value[tweet.id]
  }
}

/** authenticate twitter */
const connectTwitter = async () => {
  await store.dispatch('TWITTER_OAUTH', {type: 'step-1'});
  store.dispatch('LOADING', {show: true, message: "Authenticating Twitter"})
  watch(store.getters.getTempData, (val) => {
    if(val.oauthRequest.oauthStepOneTokens){
      window.location = val.oauthRequest.oauthStepOneTokens.twitterUrl
    }
  })
}

const revokeTwitter = async () => {
  if(confirm("Scett won't be able to post your tweets. Proceed?")) {
    await store.dispatch('DELETE_TWITTER_INFO');
  } else {
    console.log("That was close!")
  }
}
</script>

<template>
  <page>
    <template #page>
      <div class="flex flex-col space-y-3 p-2">
        <h1 class="text-xl font-semibold">Details</h1>
        <div>
          Twitter: <a :href="`https://twitter.com/${twitterInfo.handle}`" target="_blank" v-if="twitterInfo">@{{ twitterInfo.handle }}</a>
        </div>
        <div class="flex space-x-4">
          <button class="bg-red-500 hover:bg-red-600 text-white font-bold rounded-full inline-flex items-center px-3 py-1 ring-0 dark:ring-gray-300 dark:ring-2" @click="revokeTwitter()" v-if="twitterInfo && twitterInfo.handle">
            <span>Revoke Twitter</span>
          </button>
          <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full inline-flex items-center px-3 py-1 ring-2 ring-transparent dark:ring-gray-300 dark:ring-2" @click="connectTwitter()" v-else>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-5 h-5 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"/></svg>
            <span>Connect Twitter</span>
          </button>
        </div>
      </div>

      <div v-if="twitterInfo">
        <div class="w-full inline-flex items-center justify-between ring-2 ring-stone-300 p-2 rounded-b-none rounded-t">
          <h2 class="text-xl font-semibold">My Threads</h2>
          <button class="bg-blue-100 hover:bg-blue-200 text-blue-500 font-bold p-1 rounded-full inline-flex items-center" @click="addThread()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-8 h-8"><path fill="none" d="M0 0h24v24H0z"/><path d="M11 11V7h2v4h4v2h-4v4h-2v-4H7v-2h4zm1 11C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/></svg>
          </button>
        </div>

        <!-- Adding a new thread -->
        <div class="w-full inline-flex flex-col p-4 ring-2 bg-blue-100 ring-blue-300 mt-2 space-y-4" v-show="showNewThreadForm">
          <span class="inline-flex items-center">
            <label class="py-1 px-3">Title: </label>
            <input type="text" v-model="newThread.title" class="bg-blue-50 appearance-none border-2 border-blue-300 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500">
          </span>
          <div class="w-full inline-flex items-center">
            <label class="py-1 px-3">Date: </label>
            <input v-model="newThread.postingDate" type="date" :min="dateMin" class="bg-blue-50 appearance-none border-2 border-blue-300 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500">
            <label class="py-1 px-3">Time: </label>
            <input v-model="newThread.postingTime" list="times" step="300" class="bg-blue-50 appearance-none border-2 border-blue-300 rounded w-full py-2 px-2 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500">
          </div>
          <div class="inline-flex justify-center">
            <button class="bg-blue-600 hover:bg-blue-800 text-white dark:border-2 dark:border-white font-bold py-1 px-4 rounded inline-flex items-center" @click="submitNewThread()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-5 h-5 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M11 11V7h2v4h4v2h-4v4h-2v-4H7v-2h4zm1 11C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/></svg>
            <span>Add Thread</span>
          </button>
          </div>
        </div>

        <!-- Threads yet to be posted -->
        <ul class="w-full flex flex-col ring-2 ring-stone-300 my-2 p-2 rounded-t-none" v-if="threads.length" v-for="(thread, key) of threads" :key="key">
          <li class="font-semibold">
            <div class="w-full inline-flex justify-between items-center">
              <span>{{ thread.title }} <span class="font-extralight italic pl-4" v-if="todayInSeconds > thread.rawPostTime">[POSTED]</span></span>
              <button @click="toggleThreadView(thread['$id'])" class="dark:text-gray-600 font-bold py-2 px-4 rounded inline-flex items-center selection:select-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" v-show="!showThreads[thread['$id']]" class="fill-current w-6 h-6 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 3c5.392 0 9.878 3.88 10.819 9-.94 5.12-5.427 9-10.819 9-5.392 0-9.878-3.88-10.819-9C2.121 6.88 6.608 3 12 3zm0 16a9.005 9.005 0 0 0 8.777-7 9.005 9.005 0 0 0-17.554 0A9.005 9.005 0 0 0 12 19zm0-2.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" v-show="showThreads[thread['$id']]" class="fill-current w-6 h-6 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M17.882 19.297A10.949 10.949 0 0 1 12 21c-5.392 0-9.878-3.88-10.819-9a10.982 10.982 0 0 1 3.34-6.066L1.392 2.808l1.415-1.415 19.799 19.8-1.415 1.414-3.31-3.31zM5.935 7.35A8.965 8.965 0 0 0 3.223 12a9.005 9.005 0 0 0 13.201 5.838l-2.028-2.028A4.5 4.5 0 0 1 8.19 9.604L5.935 7.35zm6.979 6.978l-3.242-3.242a2.5 2.5 0 0 0 3.241 3.241zm7.893 2.264l-1.431-1.43A8.935 8.935 0 0 0 20.777 12 9.005 9.005 0 0 0 9.552 5.338L7.974 3.76C9.221 3.27 10.58 3 12 3c5.392 0 9.878 3.88 10.819 9a10.947 10.947 0 0 1-2.012 4.592zm-9.084-9.084a4.5 4.5 0 0 1 4.769 4.769l-4.77-4.769z"/></svg>
              </button>
            </div>
            <div class="w-full inline-flex items-center">
              <label class="py-1 px-3">Date: </label>
              <input v-model="thread.postingDate" type="date" :min="dateMin" class="bg-blue-50 appearance-none border-2 border-blue-300 rounded w-full py-1 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500">
              <label class="py-1 px-3">Time: </label>
              <input v-model="thread.postingTime" list="times" step="300" class="bg-blue-50 appearance-none border-2 border-blue-300 rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500">
            </div>

            <div class="flex flex-col" v-show="showThreads[thread['$id']]">
              <ol class="p-1 ml-6 font-normal space-y-2">
                <li class="p-1 mt-1 border bg-blue-50 border-blue-100 rounded" v-for="(tweet, key) of thread.tweets" :key="key">
                  <div class="flex flex-col space-y-2 p-2">
                    <textarea cols="30" rows="3" class="bg-blue-50 appearance-none focus:ring-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-200 resize-none" v-model="tweet.text" @keyup="textLimitPolice(tweet)"></textarea>
                    <div class="flex justify-end space-x-4">
                      <button class="text-blue-800 font-normal px-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-5 h-5 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M12.9 6.858l4.242 4.243L7.242 21H3v-4.243l9.9-9.9zm1.414-1.414l2.121-2.122a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414l-2.122 2.121-4.242-4.242z"/></svg>
                      </button>
                      <button class="text-red-600 font-normal px-1" @click="deleteTweet(thread['$id'], tweet.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-5 h-5 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M4 8h16v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zm2 2v10h12V10H6zm3 2h2v6H9v-6zm4 0h2v6h-2v-6zM7 5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h5v2H2V5h5zm2-1v1h6V4H9z"/></svg>
                      </button>
                    </div>
                  </div>
                </li>
              </ol>
              <div class="inline-flex self-center mt-4 space-x-2">
                <button class="inline-flex items-center bg-green-100 hover:bg-green-400 text-green-500 hover:text-white border-2 border-green-200 hover:border-transparent font-normal py-1 px-4 rounded" @click="addTweet(thread['$id'])">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-5 h-5 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M2 18h10v2H2v-2zm0-7h20v2H2v-2zm0-7h20v2H2V4zm16 14v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/></svg>
                  <span>
                    Add Tweet
                  </span>
                </button>
                <button class="inline-flex items-center bg-red-100 hover:bg-red-400 text-red-600 hover:text-white border-2 border-red-200 hover:border-transparent font-normal py-1 px-4 rounded" @click="deleteThread(thread['$id'])">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-5 h-5 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M4 8h16v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zm2 2v10h12V10H6zm3 2h2v6H9v-6zm4 0h2v6h-2v-6zM7 5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h5v2H2V5h5zm2-1v1h6V4H9z"/></svg>
                  <span>
                    Delete Thread
                  </span>
                </button>
                <button class="inline-flex items-center bg-green-100 hover:bg-green-400 text-green-500 hover:text-white border-2 border-green-200 hover:border-transparent font-normal py-1 px-4 rounded" @click="updateThread(thread)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current w-5 h-5 mr-2"><path fill="none" d="M0 0h24v24H0z"/><path d="M2 18h10v2H2v-2zm0-7h20v2H2v-2zm0-7h20v2H2V4zm16 14v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/></svg>
                  <span>
                    Save
                  </span>
                </button>
              </div>
            </div>
          </li>
        </ul>
        <ul v-else class="w-full flex flex-col ring-1 ring-stone-300 my-2 p-2 rounded-t-none">
          <li>No Threads</li>
        </ul>
        <datalist id="times">
          <option v-for="val in filteredTimes" :value="val"></option>
        </datalist>
      </div>
      <div class="w-full inline-flex items-center justify-center ring-2 ring-stone-300 p-8 rounded rounded-t" v-else>
          <span class="text-center">
            Connect to twitter to start composing threads and scheduling posts with Scett.
          </span>
      </div>
    </template>
  </page>
</template>

<style>
</style>
