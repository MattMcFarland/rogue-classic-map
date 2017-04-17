const chance = require('chance')()
const { render, range, createTileMap, updateTiles } = require('./utils')

const roomSize = 10
const roomCount = 4
const mapWidth = 150
const roomCellSize = mapWidth / roomCount | 0

const mapHeight = 25

const { tileMap } = createTileMap({ mapWidth, mapHeight })

const rooms = range(0, roomCount).map((room, i) => ({
  x: chance.integer({ min: 20 + roomCellSize * i, max: 20 + roomCellSize * i + roomSize }),
  y: chance.integer({ min: 2, max: 19 })
}))

rooms.forEach(room => {
  const growthX = Math.floor(roomSize / 2)
  const growthY = Math.floor(growthX / 2)
  updateTiles(tileMap, room.x - growthX, room.y - growthY, room.x + growthX, room.y + growthY, () => 0)
})

render(tileMap)
