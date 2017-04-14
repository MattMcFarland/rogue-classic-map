const chance = require('chance')()
const assert = require('assert')
const { pcore, parray } = require('pico-lambda')
const { pipe } = pcore
const { map, fill } = parray
const range = start => end => [...Array(end-start).keys()].map(v => start+v) 
const rangeTo = range(0)
const gridCreate = (x2, y2, value) => rangeTo(x2).map(_ => rangeTo(y2).fill(value))
const getCellAtCoordinates = (cells, [x, y]) => cells.find((cell) => cell.coords[0] === x && cell.coords[1] === y)
const cellEq = (x1, y1, x2, y2) => x1 === x2 && y1 === y2
const transpose = array => array.reduce((p, n) => n.map((item, i) => [...(p[i] || []), n[i]]), [])
const add2D = ([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2]
const randomCellCoords = cells => [x, y] = chance.pickone(cells).coords
const calculateXFromSquareIndex = i => i / 3 | 0
const calculateYFromSquareIndex = i => i % 3
const applyCenterOffset = (targetLength, totalLength) => (totalLength - targetLength) / 2 | 0

const mapWidth = 70 // minimum: 12
const mapHeight = 26 // minimum 12

const maxCellsPerRow = 3
const maxCellsPerColumn = 3
const cellWidth = mapWidth / 3
const cellHeight = mapHeight / 3

const genesis = pipe(
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

function createCells() {
  return rangeTo(9).map(index => ({
    index,
    coords: [calculateXFromSquareIndex(index), calculateYFromSquareIndex(index)],
    connected: false,
    connections: []
  }))
}
function connectCells(cells) {
  let connected = {}
  function connect(cells) {
    const connectedCells = Object.keys(connected)
    if(connectedCells.length === cells.length) return
    const from = chance.pickone(connectedCells).split(':').map(n => +n)    
    let to = pickNeighborCoordinates(cells, from)
    let count = 0
    while (to === false || connected[`${to[0]}:${to[1]}`] === true) {      
      to = pickNeighborCoordinates(cells, from)
      count++
      if (count > 20) return connect(cells)
    }

    connected[`${to[0]}:${to[1]}`] = true
    
    const cell = getCellAtCoordinates(cells, from)//.connections.push(to)
    cell.connections.push(to)
    connect(cells)
  }
  const [sx, sy] = randomCellCoords(cells)
  connected[`${sx}:${sy}`] = true
  connect(cells)
  cells.forEach(cell => {
    console.log(cell.coords, '->', cell.connections)
  })
  return cells
}
function createRooms(cells) {
  const cellPadding = Math.ceil(Math.min(cellWidth, cellHeight) * .1) + 2
  const minRoomWidth = cellWidth / 3 | 0
  const maxRoomWidth = cellWidth - cellPadding
  const minRoomHeight = cellHeight / 3 | 0
  const maxRoomHeight = cellHeight - cellPadding
  const rooms = cells.map((cell, index) => {
    let [cellX, cellY] = cell.coords
    let width = maxRoomWidth > minRoomWidth ? chance.integer({ min: minRoomWidth, max: maxRoomWidth }) : maxRoomWidth
    let height = maxRoomHeight > minRoomHeight ? chance.integer({ min: minRoomHeight, max: maxRoomHeight }) : maxRoomHeight
    let x = (applyCenterOffset(width, cellWidth) + cellX * cellWidth) | 0
    let y = (applyCenterOffset(height, cellHeight) + cellY * cellHeight) | 0

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
      str += col === 0 ? ' ' : col === 1 ? '#' : '?'
    })
  })
  console.log(str)
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

function pickNeighborCoordinates(cells, from) {
  let neighbors = chance.shuffle([[-1, 0], [1, 0], [0, -1], [0, 1]])
  let result = false
  neighbors.forEach(neighbor => {
    let neighborCoords = add2D(from, neighbor)
    if (getCellAtCoordinates(cells, neighborCoords)) { 
       result = neighborCoords;
    }
  })
  return result
}



