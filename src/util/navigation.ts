export function getCurrentRouteKey(navigation) : string {
    const state = navigation.getState();
    return state.routes[state.index].key.split('-')[0];
}