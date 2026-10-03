import mitt from 'mitt'

export type Events = {
    'showHeaderAndFooter': void;
    'hideHeaderAndFooter': void;
    'show-error': { title?: string; message: string };
    [eventName: string]: any // Define event types if needed
}

const eventBus = mitt<Events>()

export default eventBus
