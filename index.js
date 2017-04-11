const chance = require('chance')()
const range = require('node-range')
const assert = require('assert')
const { pcore } = require('pico-lambda')
const mapWidth = 70 // minimum: 12
const mapHeight = 19 // minimum 12

const cellWidth = mapWidth / 3
const cellHeight = mapHeight / 3

const genesis = pcore.pipe(
  createCells,
  connectCells,
  createRooms,
  createCorridors,
  createTiles,
  plotRooms,
  plotCorridors,
  render
)

const data = genesis()

function calculateXFromSquareIndex(index) {
  return Math.floor(index *.34 % 3)
}

function calculateYFromSquareIndex(index) {
  return index % 3
}

function applyCenterOffset(targetLength, totalLength) {
  return Math.floor((totalLength + targetLength) / 2) - targetLength
}

function gridEach(grid, x1, y1, x2, y2, cb) {
  assert(Number.isInteger(x1), 'argument must be an integer')
  assert(Number.isInteger(y1), 'argument must be an integer')
  assert(Number.isInteger(x2), 'argument must be an integer')
  assert(Number.isInteger(y2), 'argument must be an integer')
  assert(typeof cb === 'function')

  for (let x = x1; x < x2; x++) {
    for (let y = y1; y < y2; y++) {
      cb(grid[x][y], x, y)
    }
  }
}

/**
 *  Creates a 2D array, filled with a given value
 *  @param {number} x2 - set width
 *  @param {number} y2 - set height
 *  @param {number} value - value for array
 *  @returns {Array} 2D Array
 */
function gridCreate(x2, y2, value) {
  assert(Number.isInteger(x2), 'argument must be an integer')
  assert(Number.isInteger(y2), 'argument must be an integer')
  assert(Number.isInteger(value), 'argument must be an integer')
  assert(x2 >= 12, 'width must be at least 12')
  assert(y2 >= 12, 'width must be at least 12')
  let grid = []
  for (let x = 0; x < x2; x++) {
      grid[x] || (grid[x] = [])
    for (let y = 0; y < y2; y++) {
      grid[x][y] = value
    }
  }
  return grid
}

function gridMutate(grid, fromX, fromY, toX, toY, cb) {
  assert(Number.isInteger(fromX), 'argument must be an integer')
  assert(Number.isInteger(fromY), 'argument must be an integer')
  assert(Number.isInteger(toX), 'argument must be an integer')
  assert(Number.isInteger(toY), 'argument must be an integer')
  const x1 = Math.min(fromX, toX)
  const x2 = Math.max(fromX, toX)
  const y1 = Math.min(fromY, toY)
  const y2 = Math.max(fromY, toY)
  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
        grid[x][y] = cb(grid[x][y], x, y)
    }
  }
}
function createCells() {
  return range(0, 9).toArray().map(index => ({
    index,
    coords: [calculateXFromSquareIndex(index), calculateYFromSquareIndex(index)],
    connected: false,
    connections: []
  }))
}
function connectsTo(cell, x, y) {
  let result = false
  cell.connections.forEach(connector => {
    let [connX, connY] = connector
    if (x === connX && y === connY) {
      result = true
    }
  })
  return result
}

function cellsConnect(cellA, cellB) {
  return (connectsTo(cellA, cellB.coords[0], cellB.coords[1]) || connectsTo(cellB, cellA.coords[0], cellA.coords[1]))
}

function connectCells(cells) {
  let bonusConnections = chance.integer({ min: 2, max: 4})
  let order = 0
  const unconnected = (({ connected }) => connected === false)
  while (cells.filter(unconnected).length !== 0) {
    let cursor = chance.pickone(cells.filter(unconnected))
    let [cursorX, cursorY] = cursor.coords
    let found = false
    if (order === 2900) {
      break;
    }
    cursor.order = cursor.order === 0 ? 0 : order
    let directions = chance.shuffle([[0, -1], [0, 1], [-1, 0], [1, 0]])
      .forEach(([dx, dy], index) => {
        if (cursor.connected) return
        let nIndex = cells.findIndex(({coords}) => cellEq(coords[0], coords[1], dx + cursorX, dy + cursorY))
        if (nIndex > -1) {
          neighbor = cells[nIndex]
          if (!cellsConnect(neighbor, cursor)) {
            cursor.connections.push(neighbor.coords)
            cursor.connected = true
            cursorX += dx
            cursorY += dy
            return;
          }
        }
      })
    order++
  }
  return cells
}

function createRooms(cells) {
  const cellPadding = Math.ceil(Math.min(cellWidth, cellHeight) * .1) + 2
  const minRoomWidth = Math.floor(cellWidth / 3)
  const maxRoomWidth = cellWidth - cellPadding
  const minRoomHeight = Math.floor(cellHeight / 3)
  const maxRoomHeight = cellHeight - cellPadding
  const rooms = cells.map((cell, index) => {
    let [cellX, cellY] = cell.coords
    let width = maxRoomWidth > minRoomWidth ? chance.integer({ min: minRoomWidth, max: maxRoomWidth }) : maxRoomWidth
    let height = maxRoomHeight > minRoomHeight ? chance.integer({ min: minRoomHeight, max: maxRoomHeight }) : maxRoomHeight
    let x = Math.floor(applyCenterOffset(width, cellWidth) + cellX * cellWidth)
    let y = Math.floor(applyCenterOffset(height, cellHeight) + cellY * cellHeight)

    return {
      width, height,
      connections: cell.connections,
      cellX,
      cellY,
      coords:[x, y],
      origin:[Math.floor(x + width/2), Math.floor(y + height/2)]
    }
  })
  return { cells, rooms }
}

function createCorridors({ cells, rooms }) {
  const corridors = []
  rooms.forEach((room) => {
    room.connections.forEach(connection => {
      let pointA = room.origin
      let otherRoomIndex = rooms.findIndex((otherRoom) =>
        cellEq(connection[0], connection[1], otherRoom.cellX, otherRoom.cellY))
      if (otherRoomIndex > -1) {
        let pointB = rooms[otherRoomIndex].origin
        corridors.push({ pointA, pointB })
      }
    })
  })
  return ({cells, rooms, corridors})
}

function createTiles({ cells, rooms, corridors }) {
  const tiles = gridCreate(mapWidth, mapHeight, 1)
  return ({cells, rooms, corridors, tiles})
}

function plotRooms({ cells, rooms, corridors, tiles }) {
  rooms.forEach((room) => {
    const [roomX, roomY] = room.coords
    gridMutate(tiles, roomX, roomY, roomX+room.width, roomY+room.height, (_ => 0))
  })
  return ({cells, rooms, corridors, tiles})
}

function plotCorridors({ cells, rooms, corridors, tiles }) {
  corridors.forEach((corridor) => {
    let [aX, aY] = corridor.pointA
    let [bX, bY] = corridor.pointB
    const deltaX = Math.abs(aX - bX)
    const deltaY = Math.abs(aY - bY)
    bX = deltaX > deltaY ? bX : aX
    bY = deltaY > deltaX ? bY : aY
    gridMutate(tiles, aX, aY, bX, bY, (_ => 0))
  })
  return ({cells, rooms, corridors, tiles})
}

function render({ cells, rooms, corridors, tiles }) {
  let str = ''
  transpose(tiles).forEach(row => {
    str += '\n'
    row.forEach(col => {
      str += col === 0 ? '.' : col === 1 ? '#' : '?'
    })
  })
  console.log(str)
}

function transpose(array) {
  return array.reduce((p, n) => n.map((item, i) => [...(p[i] || []), n[i]]), [])
}

function cellEq(x1, y1, x2, y2) {
  return x1 === x2 && y1 === y2
}

function gridClean(grid) {
  let arr = []
  for (var i = 0; i < grid.length; i++) {
    if (undefined !== grid[i] && grid[i].length) {
      arr.push(grid[i]);
    }
  }
  return arr;
}