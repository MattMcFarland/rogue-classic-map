const Chance = require('chance')
const { pcore: { pipe } } = require('pico-lambda')
const range = (start, end) =>
  [...Array(end - start).keys()].map(v => start + v)
let chance

const defaults = {
  roomsPerRow: 3,
  roomsPerCol: 3,
  mapWidth: 60,
  mapHeight: 30
}

const genesis = pipe(calculateCellSize, createGrid, connectRooms, createTiles)
genesis(defaults)

module.exports = options => genesis(Object.assign({}, options, defaults))

function calculateCellSize (state) {
  chance = Chance(state.seed)
  const cellWidth = state.mapWidth / state.roomsPerRow | 0
  const cellHeight = state.mapHeight / state.roomsPerCol | 0
  return Object.assign({}, { cellWidth, cellHeight }, state)
}

function createGrid (state) {
  const rooms = range(0, state.roomsPerRow).map(_ =>
    range(0, state.roomsPerCol).map(
      createRoomGrid(state.cellWidth, state.cellHeight)
    ))
  return Object.assign({}, { rooms }, state)

  function createRoomGrid (cellWidth, cellHeight) {
    const minWidth = cellWidth * 0.1 | 0
    const maxWidth = cellWidth * 0.9 | 0
    const minHeight = cellHeight * 0.1 | 0
    const maxHeight = cellHeight * 0.9 | 0
    return coords => ({
      width: chance.integer({ min: minWidth, max: maxWidth }),
      height: chance.integer({ min: minHeight, max: maxHeight })
    })
  }
}

function connectRooms (state) {
  const startRoom = {
    x: chance.integer({ min: 0, max: state.roomsPerRow - 1 }),
    y: chance.integer({ min: 0, max: state.roomsPerCol - 1 })
  }
  return Object.assign(
    {},
    { connections: connect(state, [], [startRoom]) },
    state
  )

  function connect (state, connections, connectedRooms) {
    if (connectedRooms.length === 0) {
      /* state.roomsPerRow * state.roomsPerCol */ return connections
    }

    const fromRoom = chance.pickone(connectedRooms)
    const toRoom = getRandomNeighbor(state, fromRoom)
    if (toRoom) {
      if (!state.rooms[toRoom.x][toRoom.y].connected) {
        state.rooms[toRoom.x][toRoom.y].connected = true
        connectedRooms.push(toRoom)
      }
      connections.push({ fromRoom, toRoom })
    } else {
      connectedRooms.splice(connectedRooms.indexOf(fromRoom), 1)
    }
    return connect(state, connections, connectedRooms)
  }

  function getRandomNeighbor (state, fromRoom) {
    const isValidRoom = (x, y, state) =>
      x >= 0 &&
      x < state.roomsPerRow &&
      y >= 0 &&
      y < state.roomsPerCol &&
      !state.rooms[x][y].connected
    const neighbors = chance.shuffle([
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 }
    ])
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i]
      const x = fromRoom.x + neighbor.x
      const y = fromRoom.y + neighbor.y
      if (isValidRoom(x, y, state)) return { x, y }
    }
  }
}

function createTiles (state) {
  let tiles = []
  for (let x = 0; x < state.mapWidth; x++) {
    for (let y = 0; y < state.mapHeight; y++) {
      // deterimine the x and y coordinates of the tile and cross reference against the room
      tiles[x] = tiles[x] || []
      tiles[x].push(0)
    }
  }
  console.log(state.mapWidth * state.mapHeight)
  console.log(tiles.length * tiles[0].length)
}
