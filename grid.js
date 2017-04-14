const chance = require('chance')()
const { pcore, parray } = require('pico-lambda')
const { pipe } = pcore
const addFactor = ([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2]
const range = start => end => [...Array(end-start).keys()].map(v => start+v) 
const rangeTo = range(0)

const defaults = {
  roomsPerRow: 3,
  roomsPerCol: 3,
  mapWidth: 60,
  mapHeight: 30
}
const genesis = pipe(
    calculateCellSize,
    createGrid,
    connectRooms,
    // createTiles
)

console.log(genesis(defaults))

function calculateCellSize(state) {
  const cellWidth = state.mapWidth / state.roomsPerRow | 0
  const cellHeight = state.mapHeight / state.roomsPerCol | 0
  return Object.assign({}, {cellWidth, cellHeight}, state)
}

function createGrid (state) {
  const rooms = rangeTo(state.roomsPerRow).map(_ => rangeTo(state.roomsPerCol).map(createRoomGrid(state.cellWidth, state.cellHeight)))
  return Object.assign({}, {rooms}, state)
}

function isValidRoom(x, y, state) {
  return (x >= 0 && x < state.roomsPerRow && y>= 0 && y < state.roomsPerCol && !state.rooms[x][y].connected)
}
function getRandomNeighbor(state, fromRoom) {
  let neighbors = chance.shuffle([{ x: -1, y: 0 },{ x: 1, y: 0 },{ x: 0, y: -1 },{ x: 0, y: 1 }])
  for (let i = 0; i < neighbors.length; i++) {
    const neighbor = neighbors[i]
    if (isValidRoom(fromRoom.x + neighbor.x, fromRoom.y + neighbor.y, state)) {
      return {
        x: fromRoom.x + neighbor.x,
        y: fromRoom.y + neighbor.y
      }
    }
  }
}

function connectRooms (state) {
  
  function connect(state, connections, connectedRooms) {
    if (connectedRooms.length === state.roomsPerRow * state.roomsPerCol) return connections

    // when room is connected for the first time, add .connected to true
    const fromRoom = chance.pickone(connectedRooms)
    
    const toRoom = getRandomNeighbor(state, fromRoom)
    if (toRoom) {
      if (!state.rooms[toRoom.x][toRoom.y].connected) {
        state.rooms[toRoom.x, toRoom.y].connected = true
        connectedRooms.push(toRoom)
      }
      connections.push({fromRoom, toRoom})
    } else {
      connectedRooms.splice(connectedRooms.indexOf(fromRoom), 1)
    }
    return connect(state, connections, connectedRooms)
  }
  const startRoom = {
    x: chance.integer({min: 0, max: state.roomsPerRow}),
    y: chance.integer({min: 0, max: state.roomsPerCol})
  }
  state.rooms[startRoom.x, startRoom.y].connected = true
  return Object.assign({}, {connections: connect(state, [], [startRoom])}, state)
}

function createRoomGrid (cellWidth, cellHeight) {
  const minWidth = cellWidth * .1 | 0
  const maxWidth = cellWidth * .9 | 0
  const minHeight = cellHeight * .1 | 0
  const maxHeight = cellHeight * .9 | 0
  return function (coords) {
    return {
      width: chance.integer({min: minWidth, max: maxWidth}),
      height: chance.integer({min: minHeight, max: maxHeight})
    }
  }
}
