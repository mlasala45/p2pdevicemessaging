export const NetworkInfo = {
    getIPV4Address: function (): Promise<string> {
        return new Promise((resolve, reject) => {
            resolve('')
            return
            
            console.log("getIPV4Address Promise")
            const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;

            const pc = new RTCPeerConnection({
                iceServers: [],
            });

            pc.createDataChannel('');

            pc.createOffer().then((offer) => pc.setLocalDescription(offer));

            pc.onicecandidate = (ice) => {
                console.log("iceCandidate",ice.candidate)
                if (ice && ice.candidate && ice.candidate.candidate) {
                    const ipMatch = ipRegex.exec(ice.candidate.candidate);
                    if (ipMatch) {
                        resolve(ipMatch[0]);
                        pc.onicecandidate = null;
                    }
                }
            };
        })
    }
}