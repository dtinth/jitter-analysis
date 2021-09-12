const { createSocket } = require('dgram');
const uuid = require('uuid')
const { performance } = require('perf_hooks')

const socket = createSocket('udp4')
const port = 22111
const sessionId = uuid.v4()
socket.bind(port)

class RemoteServer {
  pending = {}
  stats = {}
  constructor(id, ip) {
    this.id = id
    this.ip = ip
  }
  pingSent(id, time) {
    this.pending[id] = time
  }
  pongReceived(id, time) {
    if (!this.pending[id]) {
      return
    }
    const timeDiff = Math.floor(time - this.pending[id])
    this.stats[timeDiff] = (this.stats[timeDiff] || 0) + 1
    delete this.pending[id]
  }
  getAndClearStats() {
    const output = { received: this.stats, lost: 0 }
    this.stats = {}

    // If no response for 1000ms, assume lost
    for (const id of Object.keys(this.pending)) {
      if (performance.now() - this.pending[id] > 1000) {
        output.lost++
        delete this.pending[id]
      }
    }

    return output
  }
}

const remoteServers = process.argv.slice(2).map(arg => arg.split('=')).map(([id, ip]) => new RemoteServer(id, ip))
const remoteServerByIp = Object.fromEntries(remoteServers.map(server => [server.ip, server]))

let nextId = 1

function sendPing () {
  const id = nextId++
  for (const server of remoteServers) {
    socket.send(Buffer.from(`?${sessionId}:${id}`), port, server.ip)
    server.pingSent(id, performance.now())
  }
  return id
}

socket.on('message', (message, remote) => {
  const data = message.toString()
  const [receivedSessionId, id] = data.slice(1).split(':')

  if (data[0] === '?') {
    // A ping request, send a pong
    socket.send(Buffer.from(`!${receivedSessionId}:${id}`), port, remote.address)
    return
  }

  if (data[0] === '!' && sessionId === receivedSessionId) {
    // A pong response, save the statistics
    const server = remoteServerByIp[remote.address]
    if (server) {
      server.pongReceived(id, performance.now())
      return
    }
  }
})

function printResults () {
  const report = {}
  for (const server of remoteServers) {
    report[server.id] = server.getAndClearStats()
  }
  console.log(JSON.stringify(report))
}

setTimeout(() => {
  setInterval(sendPing, 10)
}, 1000)

setInterval(printResults, 15000)