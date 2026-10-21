
export function saveBrowserSession({stationId, userId, result, type}) {

    const session = {
        stationId: stationId,
        userId: userId,
        result: result,
        type: type
    };

    localStorage.setItem("session", JSON.stringify(session));

};




export function clearSession(itemToClear) {

    localStorage.removeItem(itemToClear);

};