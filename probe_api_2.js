
const url = 'https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=binance';

try {
    const res = await fetch(url);
    const json = await res.json();
    console.log("JSON:", JSON.stringify(json, null, 2));
} catch (e) {
    console.error("FETCH ERROR:", e);
}
