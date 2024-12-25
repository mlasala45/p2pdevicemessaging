import { RTCPeerConnection, mediaDevices } from 'react-native-webrtc';
import { PermissionsAndroid } from 'react-native';

export interface PublicNetworkAddress {
  ipv4: string,
  port: number
}

function parseCandidateStr(candidateStr : string) {
  const [foundationStr, componentCode, protocol, priorityStr, ip, port, _, type] = candidateStr.replace('candidate:','').split(' ');
  const component = componentCode == '1' ? "rtp" : "rtcp"
  return {
    foundation: parseInt(foundationStr),
    component,
    protocol,
    priority: parseInt(priorityStr),
    ip,
    port: parseInt(port),
    type
  }
}

function isValidIPv4(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  if (!ipv4Pattern.test(ip)) {
      return false;
  }

  const octets = ip.split('.');
  return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
  });
}

export function getPublicAddress(): Promise<PublicNetworkAddress> {
  return new Promise(async (resolve, reject) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Google's free STUN server
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    //Event Listeners

    peerConnection.addEventListener('icecandidate', event => {
      if (event.candidate) {
        //console.log(`icecandidate ${event.candidate.candidate}`)
        const candidate = parseCandidateStr(event.candidate.candidate);
        if (candidate.type == 'srflx') {
          if(!isValidIPv4(candidate.ip)) return
          resolve({ ipv4: candidate.ip, port: candidate.port });
        }
      }
    });

    peerConnection.addEventListener('icecandidateerror', event => {
      console.log(`icecandidateerror ${event}`)
    });

    peerConnection.createDataChannel('ping')

    const sessionConstraints = {
    }
    peerConnection.createOffer(sessionConstraints)
      .then(offer => {
        console.log(`offer sdp=${offer.sdp}`)
        peerConnection.setLocalDescription(offer)
      })
      .catch(err => reject(err));
  });
}