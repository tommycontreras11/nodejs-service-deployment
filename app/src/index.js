import express from "express"

const PORT = 3000

const app = express()

app.get("/", (_req, res) => {
  res.status(200).send("Hello, World 3!")
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
