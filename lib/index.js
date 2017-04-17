const Chance = require('chance')
const { pcore: { pipe } } = require('pico-lambda')
const { render, range, createTileMap, updateTiles } = require('./utils')

let chance

const defaults = {
  roomsPerRow: 4,
  roomsPerCol: 4,
  mapWidth: 95,
  mapHeight: 25
}

const genesis = pipe(calculateCellSize, createGrid, connectRooms, createTileMap, applyRoomTiles, applyHallTiles)

module.exports = options => genesis(Object.assign({}, options, defaults))

function calculateCellSize (state) {
  chance = Chance(state.seed)
  const cellWidth = state.mapWidth / state.roomsPerRow | 0
  const cellHeight = state.mapHeight / state.roomsPerCol | 0
  return Object.assign({}, { cellWidth, cellHeight }, state)
}

function createGrid (state) {
  const rooms = range(0, state.roomsPerRow).map(_ => range(0, state.roomsPerCol).map(createRoomGrid(state.cellWidth, state.cellHeight)))
  return Object.assign({}, { rooms }, state)

  function createRoomGrid (cellWidth, cellHeight) {
    const maxWidth = cellWidth - 2
    const maxHeight = cellHeight - 2
    return coords => ({
      exits: [],
      width: chance.integer({ min: 3, max: maxWidth }),
      height: chance.integer({ min: 3, max: maxHeight })
    })
  }
}

function connectRooms (state) {
  const startRoom = {
    x: chance.integer({ min: 0, max: state.roomsPerRow - 1 }),
    y: chance.integer({ min: 0, max: state.roomsPerCol - 1 })
  }
  return Object.assign({}, { connections: connect(state, [], [startRoom]) }, state)

  function connect (state, connections, connectedRooms) {
    if (connectedRooms.length === 0) {
      /* state.roomsPerRow * state.roomsPerCol */ return connections
    }

    const fromRoom = chance.pickone(connectedRooms)
    const toRoom = getRandomNeighbor(state, fromRoom)
    if (toRoom) {
      if (!state.rooms[toRoom.x][toRoom.y].connected) {
        state.rooms[toRoom.x][toRoom.y].connected = true
        state.rooms[toRoom.x][toRoom.y].exits.push([fromRoom.x, fromRoom.y])
        connectedRooms.push(toRoom)
      }
      connections.push({ fromRoom, toRoom })
    } else {
      connectedRooms.splice(connectedRooms.indexOf(fromRoom), 1)
    }
    return connect(state, connections, connectedRooms)
  }

  function getRandomNeighbor (state, fromRoom) {
    const isValidRoom = (x, y, state) => x >= 0 && x < state.roomsPerRow && y >= 0 && y < state.roomsPerCol && !state.rooms[x][y].connected
    const neighbors = chance.shuffle([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }])
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i]
      const x = fromRoom.x + neighbor.x
      const y = fromRoom.y + neighbor.y
      if (isValidRoom(x, y, state)) return { x, y }
    }
  }
}

function applyRoomTiles (state) {
  state.rooms.forEach((roomColumn, x) => {
    roomColumn.forEach((room, y) => {
      const offsetX = x * state.cellWidth
      const offsetY = y * state.cellHeight
      room.x = x
      room.y = y
      room.x1 = offsetX + chance.integer({ min: 1, max: state.cellWidth - (room.width + 1) })
      room.x2 = room.x1 + room.width - 1
      room.y1 = offsetY + chance.integer({ min: 1, max: state.cellHeight - (room.height + 1) })
      room.y2 = room.y1 + room.height - 1
      updateTiles(state.tileMap, room.x1, room.y1, room.x2, room.y2, () => 0)
    })
  })
  return state
}
function getDirection (roomA, roomB) {
  if (roomA.x === roomB.x && roomA.y < roomB.y) return 'NORTH'
  if (roomA.x > roomB.x && roomA.y === roomB.y) return 'EAST'
  if (roomA.x === roomB.x && roomA.y > roomB.y) return 'SOUTH'
  if (roomA.x < roomB.x && roomA.y === roomB.y) return 'WEST'
  return undefined
}

function applyHallTiles (state) {
  const hallPaths = state.connections.map(connection => {
    const fromRoom = state.rooms[connection.fromRoom.x][connection.fromRoom.y]
    const toRoom = state.rooms[connection.toRoom.x][connection.toRoom.y]
    const heading = getDirection(toRoom, fromRoom)

    const randomizeX = heading === 'NORTH' || heading === 'SOUTH'
    const randomizeY = heading === 'EAST' || heading === 'WEST'
    const from = {
      x: randomizeX ? chance.integer({ min: fromRoom.x1, max: fromRoom.x2 }) : heading === 'EAST' ? fromRoom.x1 + 1 : fromRoom.x2 - 1,
      y: randomizeY ? chance.integer({ min: fromRoom.y1, max: fromRoom.y2 }) : heading === 'NORTH' ? fromRoom.y1 + 1 : fromRoom.y2 - 1
    }
    const to = {
      x: randomizeX ? chance.integer({ min: toRoom.x1, max: toRoom.x2 }) : heading === 'EAST' ? toRoom.x2 - 1 : toRoom.x1 + 1,
      y: randomizeY ? chance.integer({ min: toRoom.y1, max: toRoom.y2 }) : heading === 'NORTH' ? toRoom.y2 - 1 : toRoom.y1 + 1
    }
    const minHallLength = 1
    const maxHallLength = 2
    var tries = 0

    const paths = digTunnel(from, to, heading)
    paths.forEach((p, i) => {
      state.tileMap[p.x][p.y] = 0

      if (paths[i - 1]) {
        let from = paths[i - 1]

        updateTiles(state.tileMap, from.x, from.y, p.x, p.y, () => 0)
      }
      if (i === paths.length - 1) {
        updateTiles(state.tileMap, from.x, from.y, to.x, p.y, () => 0)
      }
      if (i === 0) {
        state.tileMap[p.x][p.y] = 0
      }
    })
    return paths

    function digTunnel (from, to, heading, path = []) {
      tries++
      if (tries > 100) {
        path.push({ x: to.x, y: to.y })
        return path
      }
      if (from.x >= toRoom.x1 && from.x <= toRoom.x2 && from.y >= toRoom.y1 && from.y <= toRoom.y2) {
        path.push({ x: from.x, y: from.y })

        return path
      }
      const digSize = chance.integer({ min: minHallLength, max: maxHallLength })
      if (heading === 'NORTH') {
        from.y -= digSize
      }
      if (heading === 'EAST') {
        from.x += digSize
      }
      if (heading === 'SOUTH') {
        from.y += digSize
      }
      if (heading === 'WEST') {
        from.x -= digSize
      }
      if (from.x > to.x) heading !== 'EAST' ? (heading = 'WEST') : (heading = chance.pickone(['SOUTH', 'NORTH']))
      if (from.y > to.y) heading !== 'SOUTH' ? (heading = 'NORTH') : (heading = chance.pickone(['EAST', 'WEST']))
      if (from.x < to.x) heading !== 'WEST' ? (heading = 'EAST') : (heading = chance.pickone(['SOUTH', 'NORTH']))
      if (from.y < to.y) heading !== 'NORTH' ? (heading = 'SOUTH') : (heading = chance.pickone(['EAST', 'WEST']))

      path.push({ x: from.x, y: from.y })
      return digTunnel(from, to, heading, path)
    }
  })
  return Object.assign({}, state, { hallPaths })
}

/// //////////////////////////

var result = genesis(defaults)

render(result.tileMap)
// console.log(result.rooms)
