const chance = require('chance')()
const { pcore } = require('pico-lambda')
const { pipe } = pcore
const range = start => end => [...Array(end - start).keys()].map(v => start + v)
const rangeTo = range(0)
const between = (x, min, max) => x >= min && x <= max

function transpose (array) {
  return array.reduce((p, n) => n.map((item, i) => [...(p[i] || []), n[i]]), [])
}

function render (tiles) {
  let str = ''
  transpose(tiles).forEach(row => {
    str += '\n'
    row.forEach(col => {
      str += col === '0' ? ' ' : col === '1' ? '#' : '?'
    })
  })
  console.log(str)
}

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
    createTiles
)

const game = genesis(defaults)
console.log(game)
console.log(render(game.tiles))

function renderCell (x, y, state) {
  const roomWidth = state.rooms[x][y].width
  const roomHeight = state.rooms[x][y].height
  const roomLeft = (state.cellWidth - roomWidth) / 2 | 0
  const roomTop = (state.cellHeight - roomHeight) / 2 | 0
  const roomRight = roomLeft + roomWidth
  const roomBottom = roomTop + roomHeight
  const ewHallRow = state.cellHeight / 2 | 0
  const nsHallCol = state.cellWidth / 2 | 0
  const hasNorthExit = true
  const hasEastExit = true
  const hasWestExit = true
  const hasSouthExit = true

  return rangeTo(state.cellWidth).map((x) => {
    return rangeTo(state.cellHeight).map((y) => {
      if (between(x, roomLeft, roomRight) && between(y, roomTop, roomBottom)) {
        return '0'
      }
      if (y < roomTop && hasNorthExit && x === nsHallCol) {
        return '0'
      }
      if (y > roomBottom && hasSouthExit && x === nsHallCol) {
        return '0'
      }
      if (x < roomLeft && hasWestExit && y === ewHallRow) {
        return '0'
      }
      if (x > roomRight && hasEastExit && y === ewHallRow) {
        return '0'
      }

      return '1'
    })
  })
}

function createTiles (state) {
  state.tiles = renderCell(0, 0, state)

  return state
}

function calculateCellSize (state) {
  const cellWidth = state.mapWidth / state.roomsPerRow | 0
  const cellHeight = state.mapHeight / state.roomsPerCol | 0
  return Object.assign({}, {cellWidth, cellHeight}, state)
}

function createGrid (state) {
  const rooms = rangeTo(state.roomsPerRow).map(_ => rangeTo(state.roomsPerCol).map(createRoomGrid(state.cellWidth, state.cellHeight)))
  return Object.assign({}, {rooms}, state)
}

function isValidRoom (x, y, state) {
  return (x >= 0 && x < state.roomsPerRow && y >= 0 && y < state.roomsPerCol && !state.rooms[x][y].connected)
}
function getRandomNeighbor (state, fromRoom) {
  let neighbors = chance.shuffle([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }])
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
  function connect (state, connections, connectedRooms, numConnected) {
    if (numConnected === state.roomsPerRow * state.roomsPerCol) return connections

    // when room is connected for the first time, add .connected to true
    const fromRoom = chance.pickone(connectedRooms)

    const toRoom = getRandomNeighbor(state, fromRoom)
    if (toRoom) {
      if (!state.rooms[toRoom.x][toRoom.y].connected) {
        state.rooms[toRoom.x][toRoom.y].connected = true
        connectedRooms.push(toRoom)
        numConnected++
      }
      connections.push({fromRoom, toRoom})
    } else {
      connectedRooms.splice(connectedRooms.indexOf(fromRoom), 1)
    }
    return connect(state, connections, connectedRooms, numConnected)
  }
  const startRoom = {
    x: chance.integer({min: 0, max: state.roomsPerRow - 1}),
    y: chance.integer({min: 0, max: state.roomsPerCol - 1})
  }
  return Object.assign({}, {connections: connect(state, [], [startRoom], 0)}, state)
}

function createRoomGrid (cellWidth, cellHeight) {
  const minWidth = cellWidth * 0.1 | 0
  const maxWidth = cellWidth * 0.9 | 0
  const minHeight = cellHeight * 0.1 | 0
  const maxHeight = cellHeight * 0.9 | 0
  return function (coords) {
    return {
      width: chance.integer({min: minWidth, max: maxWidth}),
      height: chance.integer({min: minHeight, max: maxHeight})
    }
  }
}
