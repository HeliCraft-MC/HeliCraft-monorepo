import type {Emitter} from "mitt";
import type {Events} from "~/utils/event-bus.utils";

export const useAppEventBus: () => Emitter<Events> = () => {
    const nuxtApp = useNuxtApp()
    return nuxtApp.$eventBus as Emitter<Events>
}