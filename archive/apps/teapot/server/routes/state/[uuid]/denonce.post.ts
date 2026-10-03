export default defineEventHandler(async (event) => {
    const uuid = getRouterParam(event, 'uuid');
    const adminUuid = requireAuthenticatedUuid(event);
    await denonceState(uuid, adminUuid);
    return { ok: true };
});
