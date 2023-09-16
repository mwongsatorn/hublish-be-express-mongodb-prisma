import express from 'express'

const app = express()

app.use(express.json())

app.get('/', async (req, res) => {
  res.send("Hello from express")
})

app.listen(8080);