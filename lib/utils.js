const range = (start, end) => [...Array(end - start).keys()].map(v => start + v)

function render (tiles) {
  let str = ''
  transpose(tiles).forEach(row => {
    str += '\n'
    row.forEach(col => {
      str += col === 0 ? '.' : col === 1 ? '#' : '?'
    })
  })
  console.log(str)
}

function transpose (array) {
  return array.reduce((p, n) => n.map((item, i) => [...(p[i] || []), n[i]]), [])
}

function createTileMap (state) {
  let tileMap = []
  for (let x = 0; x < state.mapWidth; x++) {
    tileMap[x] = []
    for (let y = 0; y < state.mapHeight; y++) {
      tileMap[x][y] = 1
    }
  }
  return Object.assign({}, { tileMap }, state)
}

function updateTiles (grid, fromX, fromY, toX, toY, cb) {
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

module.exports = {
  render,
  transpose,
  range,
  createTileMap,
  updateTiles
}
