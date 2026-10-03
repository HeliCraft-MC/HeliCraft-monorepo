import { default as eventBus } from '../utils/event-bus.utils';
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
    return {
        provide: {
            eventBus
        }
    }
})