
const url = 'https://criptoya.com/api/binancep2p/USDT/VES/1';

try {
    const res = await fetch(url);
    const json = await res.json();
    console.log("KEYS:", Object.keys(json));

    if (json.ask && json.ask.length > 0) {
        // Log first 2 ads to check structure
        console.log("SAMPLE AD 1:", JSON.stringify(json.ask[0], null, 2));
    } else {
        console.log("NO ADS FOUND");
    }
} catch (e) {
    console.error("FETCH ERROR:", e);
}
