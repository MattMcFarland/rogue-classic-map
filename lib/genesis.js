const assert = require('assert')
const Chance = require('chance')
module.exports = ({
 mapWidth, mapHeight, cellsPerRow, cellsPerColumn, seed
}) => {
  const chance = Chance(seed)
  const cellWidth = mapWidth / cellsPerRow | 0
  const cellHeight = mapHeight / cellsPerColumn | 0
  const cells = range(0, mapWidth * mapHeight).reduce((grid, i) => {
    const x = i / cellsPerRow | 0
    const y = i % cellsPerColumn
    grid[x] = grid[x] || []
    grid[x][y] = { connections: [], get connected() { return this.connections.length > 0}}
    Object.defineProperty(grid, 'size', {
      get: function() { return this.length * this[0].length}
    })
    return grid
  },[])
  
  // return { cells, rooms, corridors, tiles }
}

function connect(cells, connected) {
  if (!connected) createFirstConnection
  const connectedCells = Object.keys(connected)
  if (connectedCells.length === cells.size)

}

function applyCenterOffset(targetLength, totalLength) {
  return Math.floor((totalLength + targetLength) / 2) - targetLength
}

